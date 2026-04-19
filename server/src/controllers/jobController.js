const pool = require('../db/pool');
const pipelineService = require('../services/pipelineService');

const jobController = {
    async create(req, res) {
        try {
            const {
                companyId, title, description,
                activeCapacity, decayWindowMinutes,
                decayPenaltyDivisor, maxDecays,
            } = req.body;

            if (!companyId || !title || !activeCapacity) {
                return res.status(400).json({
                    error: 'companyId, title, and activeCapacity are required',
                });
            }

            if (activeCapacity < 1) {
                return res.status(400).json({
                    error: 'activeCapacity must be at least 1',
                });
            }

            const companyCheck = await pool.query(
                'SELECT id FROM companies WHERE id = $1', 
                [companyId]
            );

            if (companyCheck.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'Company not found' 
                });
            }

            const result = await pool.query(
                `INSERT INTO job_openings 
                 (company_id, title, description, active_capacity, 
                  decay_window_minutes, decay_penalty_divisor, max_decays)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    companyId,
                    title.trim(),
                    description || null,
                    activeCapacity,
                    decayWindowMinutes || 1440,
                    decayPenaltyDivisor || 3,
                    maxDecays || 3,
                ]
            );

            res.status(201).json({ data: result.rows[0] });
        } catch (error) {
            console.error('Error creating job:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getPipeline(req, res) {
        try {
            const { id } = req.params;
            const state = await pipelineService.getPipelineState(id);
            res.json({ data: state });
        } catch (error) {
            if (error.message === 'Job opening not found') {
                return res.status(404).json({ error: error.message });
            }
            console.error('Error getting pipeline:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async listByCompany(req, res) {
        try {
            const { companyId } = req.params;
            const result = await pool.query(
                `SELECT j.*, 
                    (SELECT COUNT(*) FROM applications 
                     WHERE job_id = j.id 
                     AND status = 'active') as active_count,
                    (SELECT COUNT(*) FROM applications 
                     WHERE job_id = j.id 
                     AND status = 'waitlisted') as waitlisted_count,
                    (SELECT COUNT(*) FROM applications 
                     WHERE job_id = j.id) as total_applications
                 FROM job_openings j 
                 WHERE j.company_id = $1 
                 ORDER BY j.created_at DESC`,
                [companyId]
            );
            res.json({ data: result.rows });
        } catch (error) {
            console.error('Error listing jobs:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['open', 'closed', 'paused'].includes(status)) {
                return res.status(400).json({
                    error: 'Status must be open, closed, or paused',
                });
            }

            const result = await pool.query(
                `UPDATE job_openings 
                 SET status = $1 WHERE id = $2 
                 RETURNING *`,
                [status, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'Job opening not found' 
                });
            }

            res.json({ data: result.rows[0] });
        } catch (error) {
            console.error('Error updating job status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
};

module.exports = jobController;