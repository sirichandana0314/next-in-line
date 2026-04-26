const pool = require('../db/pool');

class PipelineService {

    async applyToJob(jobId, applicantName, applicantEmail) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const jobResult = await client.query(
                `SELECT id, active_capacity, status 
                 FROM job_openings 
                 WHERE id = $1 
                 FOR UPDATE`,
                [jobId]
            );

            if (jobResult.rows.length === 0) {
                throw new Error('Job opening not found');
            }

            const job = jobResult.rows[0];

            if (job.status !== 'open') {
                throw new Error('Job opening is not accepting applications');
            }

            const existingApp = await client.query(
                `SELECT id FROM applications 
                 WHERE job_id = $1 AND applicant_email = $2`,
                [jobId, applicantEmail]
            );

            if (existingApp.rows.length > 0) {
                throw new Error('You have already applied to this job');
            }

            const activeCountResult = await client.query(
                `SELECT COUNT(*) as count 
                 FROM applications 
                 WHERE job_id = $1 
                 AND status IN ('active', 'pending_acknowledgment')`,
                [jobId]
            );

            const activeCount = parseInt(activeCountResult.rows[0].count);
            let status;
            let waitlistPosition = null;

            if (activeCount < job.active_capacity) {
                status = 'active';
            } else {
                status = 'waitlisted';

                const maxPosResult = await client.query(
                    `SELECT COALESCE(MAX(waitlist_position), 0) as max_pos 
                     FROM applications 
                     WHERE job_id = $1 
                     AND status = 'waitlisted'`,
                    [jobId]
                );
                waitlistPosition = parseInt(maxPosResult.rows[0].max_pos) + 1;
            }

            const applicationResult = await client.query(
                `INSERT INTO applications 
                 (job_id, applicant_name, applicant_email, 
                  status, waitlist_position, applied_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 RETURNING *`,
                [jobId, applicantName, applicantEmail, 
                 status, waitlistPosition]
            );

            const application = applicationResult.rows[0];

            await this._logStatusChange(
                client, application.id, null, status, 
                'Initial application'
            );

            await client.query('COMMIT');
            return application;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async exitPipeline(applicationId, exitReason) {
        const validReasons = ['hired', 'rejected', 'withdrawn'];
        if (!validReasons.includes(exitReason)) {
            throw new Error(
                `Invalid exit reason. Must be one of: ${validReasons.join(', ')}`
            );
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const appResult = await client.query(
                `SELECT a.*, j.active_capacity
                 FROM applications a
                 JOIN job_openings j ON a.job_id = j.id
                 WHERE a.id = $1
                 FOR UPDATE OF a`,
                [applicationId]
            );

            if (appResult.rows.length === 0) {
                throw new Error('Application not found');
            }

            const application = appResult.rows[0];

            if (!['active', 'pending_acknowledgment', 
                  'waitlisted'].includes(application.status)) {
                throw new Error(
                    `Cannot exit pipeline from status: ${application.status}`
                );
            }

            const previousStatus = application.status;

            await client.query(
                `UPDATE applications 
                 SET status = $1, 
                     waitlist_position = NULL, 
                     promoted_at = NULL
                 WHERE id = $2`,
                [exitReason, applicationId]
            );

            await this._logStatusChange(
                client, applicationId, previousStatus, 
                exitReason, `Exited pipeline: ${exitReason}`
            );

            if (['active', 
                 'pending_acknowledgment'].includes(previousStatus)) {
                await this._promoteNext(client, application.job_id);
            }

            await client.query('COMMIT');
            return { 
                message: `Application ${exitReason} successfully`, 
                applicationId 
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async acknowledgePromotion(applicationId) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const appResult = await client.query(
                `SELECT * FROM applications 
                 WHERE id = $1 FOR UPDATE`,
                [applicationId]
            );

            if (appResult.rows.length === 0) {
                throw new Error('Application not found');
            }

            const application = appResult.rows[0];

            if (application.status !== 'pending_acknowledgment') {
                throw new Error(
                    `Cannot acknowledge from status: ${application.status}. ` +
                    `Must be pending_acknowledgment.`
                );
            }

            await client.query(
                `UPDATE applications 
                 SET status = 'active', 
                     acknowledged_at = NOW(), 
                     waitlist_position = NULL
                 WHERE id = $1`,
                [applicationId]
            );

            await this._logStatusChange(
                client, applicationId,
                'pending_acknowledgment', 'active',
                'Applicant acknowledged promotion'
            );

            await client.query('COMMIT');
            return { 
                message: 'Promotion acknowledged successfully', 
                applicationId 
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async checkAndProcessDecays() {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const expiredResult = await client.query(
                `SELECT a.id, a.job_id, a.decay_count, a.applicant_name,
                        j.decay_window_minutes, 
                        j.decay_penalty_divisor, 
                        j.max_decays
                 FROM applications a
                 JOIN job_openings j ON a.job_id = j.id
                 WHERE a.status = 'pending_acknowledgment'
                 AND a.promoted_at + 
                     (j.decay_window_minutes || ' minutes')::INTERVAL < NOW()
                 FOR UPDATE OF a`
            );

            const processed = [];

            for (const app of expiredResult.rows) {
                const newDecayCount = app.decay_count + 1;

                if (newDecayCount >= app.max_decays) {
                    await client.query(
                        `UPDATE applications 
                         SET status = 'rejected', 
                             decay_count = $1,
                             waitlist_position = NULL, 
                             promoted_at = NULL
                         WHERE id = $2`,
                        [newDecayCount, app.id]
                    );

                    await this._logStatusChange(
                        client, app.id,
                        'pending_acknowledgment', 'rejected',
                        `Auto-rejected after ${newDecayCount} decay(s)`,
                        { decay_count: newDecayCount, 
                          max_decays: app.max_decays }
                    );

                } else {
                    const waitlistCountResult = await client.query(
                        `SELECT COUNT(*) as count FROM applications 
                         WHERE job_id = $1 AND status = 'waitlisted'`,
                        [app.job_id]
                    );
                    const waitlistSize = parseInt(
                        waitlistCountResult.rows[0].count
                    );

                    const maxPosResult = await client.query(
                        `SELECT COALESCE(MAX(waitlist_position), 0) as max_pos 
                         FROM applications 
                         WHERE job_id = $1 AND status = 'waitlisted'`,
                        [app.job_id]
                    );
                    const maxPos = parseInt(maxPosResult.rows[0].max_pos);

                    const penalty = Math.max(
                        1,
                        Math.ceil(
                            waitlistSize / app.decay_penalty_divisor
                        ) * newDecayCount
                    );
                    const newPosition = maxPos + penalty;

                    await client.query(
                        `UPDATE applications 
                         SET status = 'waitlisted', 
                             decay_count = $1,
                             waitlist_position = $2, 
                             promoted_at = NULL
                         WHERE id = $3`,
                        [newDecayCount, newPosition, app.id]
                    );

                    await this._logStatusChange(
                        client, app.id,
                        'pending_acknowledgment', 'waitlisted',
                        `Decayed back (decay #${newDecayCount}). ` +
                        `New position: ${newPosition}`,
                        { decay_count: newDecayCount, 
                          penalty, 
                          new_position: newPosition }
                    );
                }

                processed.push(app.id);
                await this._promoteNext(client, app.job_id);
            }

            await client.query('COMMIT');

            if (processed.length > 0) {
                console.log(
                    `[Decay] Processed ${processed.length} expired promotion(s)`
                );
            }

            return processed;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[Decay] Error:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async getApplicationStatus(applicationId) {
        const result = await pool.query(
            `SELECT a.*, 
                    j.title as job_title, 
                    j.active_capacity,
                    j.decay_window_minutes, 
                    c.name as company_name
             FROM applications a
             JOIN job_openings j ON a.job_id = j.id
             JOIN companies c ON j.company_id = c.id
             WHERE a.id = $1`,
            [applicationId]
        );

        if (result.rows.length === 0) {
            throw new Error('Application not found');
        }

        const app = result.rows[0];

        let queuePosition = null;
        let totalWaitlisted = null;

        if (app.status === 'waitlisted') {
            const posResult = await pool.query(
                `SELECT COUNT(*) as ahead 
                 FROM applications 
                 WHERE job_id = $1 
                 AND status = 'waitlisted' 
                 AND waitlist_position < $2`,
                [app.job_id, app.waitlist_position]
            );
            queuePosition = parseInt(posResult.rows[0].ahead) + 1;

            const totalResult = await pool.query(
                `SELECT COUNT(*) as total 
                 FROM applications 
                 WHERE job_id = $1 AND status = 'waitlisted'`,
                [app.job_id]
            );
            totalWaitlisted = parseInt(totalResult.rows[0].total);
        }

        let acknowledgmentDeadline = null;
        if (app.status === 'pending_acknowledgment' && app.promoted_at) {
            const deadline = new Date(app.promoted_at);
            deadline.setMinutes(
                deadline.getMinutes() + app.decay_window_minutes
            );
            acknowledgmentDeadline = deadline.toISOString();
        }

        return {
            id: app.id,
            jobTitle: app.job_title,
            companyName: app.company_name,
            applicantName: app.applicant_name,
            applicantEmail: app.applicant_email,
            status: app.status,
            queuePosition,
            totalWaitlisted,
            decayCount: app.decay_count,
            acknowledgmentDeadline,
            appliedAt: app.applied_at,
            promotedAt: app.promoted_at,
            acknowledgedAt: app.acknowledged_at,
        };
    }

    async getApplicationHistory(applicationId) {
        const result = await pool.query(
            `SELECT * FROM application_status_log 
             WHERE application_id = $1 
             ORDER BY created_at ASC`,
            [applicationId]
        );
        return result.rows;
    }

    async getPipelineState(jobId) {
        const jobResult = await pool.query(
            `SELECT j.*, c.name as company_name 
             FROM job_openings j 
             JOIN companies c ON j.company_id = c.id 
             WHERE j.id = $1`,
            [jobId]
        );

        if (jobResult.rows.length === 0) {
            throw new Error('Job opening not found');
        }

        const job = jobResult.rows[0];

        const activeResult = await pool.query(
            `SELECT id, applicant_name, applicant_email, 
                    status, applied_at, acknowledged_at
             FROM applications 
             WHERE job_id = $1 AND status = 'active'
             ORDER BY applied_at ASC`,
            [jobId]
        );

        const pendingResult = await pool.query(
            `SELECT id, applicant_name, applicant_email, 
                    status, promoted_at, decay_count,
                    promoted_at + ($2 || ' minutes')::INTERVAL as deadline
             FROM applications 
             WHERE job_id = $1 AND status = 'pending_acknowledgment'
             ORDER BY promoted_at ASC`,
            [jobId, String(job.decay_window_minutes)]
        );

        const waitlistedResult = await pool.query(
            `SELECT id, applicant_name, applicant_email, 
                    status, waitlist_position, decay_count, applied_at
             FROM applications 
             WHERE job_id = $1 AND status = 'waitlisted'
             ORDER BY waitlist_position ASC`,
            [jobId]
        );

        const exitedResult = await pool.query(
            `SELECT id, applicant_name, applicant_email, 
                    status, applied_at, updated_at
             FROM applications 
             WHERE job_id = $1 
             AND status IN ('hired', 'rejected', 'withdrawn')
             ORDER BY updated_at DESC`,
            [jobId]
        );

        return {
            job: {
                id: job.id,
                title: job.title,
                companyName: job.company_name,
                activeCapacity: job.active_capacity,
                decayWindowMinutes: job.decay_window_minutes,
                status: job.status,
            },
            pipeline: {
                active: activeResult.rows,
                pendingAcknowledgment: pendingResult.rows,
                waitlisted: waitlistedResult.rows,
                exited: exitedResult.rows,
            },
            stats: {
                activeCount: activeResult.rows.length,
                pendingCount: pendingResult.rows.length,
                waitlistedCount: waitlistedResult.rows.length,
                exitedCount: exitedResult.rows.length,
                totalApplications:
                    activeResult.rows.length +
                    pendingResult.rows.length +
                    waitlistedResult.rows.length +
                    exitedResult.rows.length,
                spotsAvailable: Math.max(
                    0,
                    job.active_capacity -
                    activeResult.rows.length -
                    pendingResult.rows.length
                ),
            },
        };
    }

    async _promoteNext(client, jobId) {
        const jobResult = await client.query(
            `SELECT active_capacity FROM job_openings WHERE id = $1`,
            [jobId]
        );

        const capacity = jobResult.rows[0].active_capacity;

        const activeCountResult = await client.query(
            `SELECT COUNT(*) as count 
             FROM applications 
             WHERE job_id = $1 
             AND status IN ('active', 'pending_acknowledgment')`,
            [jobId]
        );

        const activeCount = parseInt(activeCountResult.rows[0].count);

        if (activeCount >= capacity) {
            return null;
        }

        const nextResult = await client.query(
            `SELECT id, applicant_name FROM applications 
             WHERE job_id = $1 AND status = 'waitlisted'
             ORDER BY waitlist_position ASC
             LIMIT 1
             FOR UPDATE`,
            [jobId]
        );

        if (nextResult.rows.length === 0) {
            return null;
        }

        const next = nextResult.rows[0];

        await client.query(
            `UPDATE applications 
             SET status = 'pending_acknowledgment', 
                 promoted_at = NOW(), 
                 waitlist_position = NULL
             WHERE id = $1`,
            [next.id]
        );

        await this._logStatusChange(
            client, next.id,
            'waitlisted', 'pending_acknowledgment',
            'Auto-promoted from waitlist — slot became available'
        );

        console.log(`[Pipeline] Promoted ${next.applicant_name}`);
        return next;
    }

    async _logStatusChange(
        client, applicationId, previousStatus, 
        newStatus, reason, metadata = {}
    ) {
        await client.query(
            `INSERT INTO application_status_log 
             (application_id, previous_status, new_status, reason, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [applicationId, previousStatus, newStatus, 
             reason, JSON.stringify(metadata)]
        );
    }
    async lookupByEmail(email) {
    const result = await pool.query(
        `SELECT a.id, a.applicant_name, a.applicant_email, 
                a.status, a.waitlist_position, a.applied_at,
                j.title as job_title, c.name as company_name
         FROM applications a
         JOIN job_openings j ON a.job_id = j.id
         JOIN companies c ON j.company_id = c.id
         WHERE a.applicant_email = $1
         ORDER BY a.applied_at DESC`,
        [email]
    );
    return result.rows;
}
}




module.exports = new PipelineService();