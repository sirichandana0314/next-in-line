/**
 * CONCURRENCY TEST
 * 
 * This test proves that when multiple applications arrive
 * simultaneously for the last available spot, our
 * SELECT FOR UPDATE locking prevents capacity from
 * being exceeded.
 * 
 * How to run:
 * node src/tests/concurrencyTest.js
 * 
 * Expected result:
 * - Exactly ONE applicant gets the last active spot
 * - All others are waitlisted
 * - Total active never exceeds capacity
 */

require('dotenv').config();
const pool = require('../db/pool');

async function runConcurrencyTest() {
    console.log('\n🧪 CONCURRENCY TEST STARTING...\n');

    // Step 1: Create a test job with capacity 1
    const jobResult = await pool.query(
        `INSERT INTO job_openings 
         (company_id, title, active_capacity, decay_window_minutes)
         VALUES (
             (SELECT id FROM companies LIMIT 1),
             'Concurrency Test Job',
             1,
             1440
         )
         RETURNING id`
    );

    const jobId = jobResult.rows[0].id;
    console.log(`✅ Created test job with capacity = 1`);
    console.log(`   Job ID: ${jobId}\n`);

    // Step 2: Fire 5 applications SIMULTANEOUSLY
    console.log('🔥 Firing 5 simultaneous applications...\n');

    const applicants = [
        { name: 'Concurrent Alice', email: `alice-${Date.now()}@test.com` },
        { name: 'Concurrent Bob', email: `bob-${Date.now()}@test.com` },
        { name: 'Concurrent Charlie', email: `charlie-${Date.now()}@test.com` },
        { name: 'Concurrent Diana', email: `diana-${Date.now()}@test.com` },
        { name: 'Concurrent Evan', email: `evan-${Date.now()}@test.com` },
    ];

    // All 5 hit the database at the exact same time
    const results = await Promise.allSettled(
        applicants.map((applicant) => applyWithLocking(jobId, applicant))
    );

    // Step 3: Check results
    console.log('📊 RESULTS:\n');

    let activeCount = 0;
    let waitlistedCount = 0;
    let errorCount = 0;

    results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
            const app = result.value;
            const status = app.status.toUpperCase();
            const icon = app.status === 'active' ? '🟢' : '🔵';
            console.log(`   ${icon} ${applicants[idx].name}: ${status}`);
            if (app.status === 'active') activeCount++;
            if (app.status === 'waitlisted') waitlistedCount++;
        } else {
            console.log(`   ❌ ${applicants[idx].name}: ERROR - ${result.reason.message}`);
            errorCount++;
        }
    });

    // Step 4: Verify capacity was never exceeded
    const verifyResult = await pool.query(
        `SELECT COUNT(*) as count FROM applications 
         WHERE job_id = $1 AND status = 'active'`,
        [jobId]
    );

    const finalActiveCount = parseInt(verifyResult.rows[0].count);

    console.log('\n📋 SUMMARY:\n');
    console.log(`   Job Capacity:     1`);
    console.log(`   Total Applicants: 5`);
    console.log(`   Active:           ${activeCount}`);
    console.log(`   Waitlisted:       ${waitlistedCount}`);
    console.log(`   Errors:           ${errorCount}`);
    console.log(`   DB Active Count:  ${finalActiveCount}`);

    console.log('\n🏁 VERDICT:\n');

    if (finalActiveCount === 1 && activeCount === 1) {
        console.log('   ✅ PASSED — Exactly 1 applicant got the active spot');
        console.log('   ✅ PASSED — Capacity was NEVER exceeded');
        console.log('   ✅ PASSED — SELECT FOR UPDATE locking works correctly');
        console.log('   ✅ PASSED — Race condition is fully prevented\n');
    } else {
        console.log(`   ❌ FAILED — Expected 1 active, got ${finalActiveCount}`);
        console.log('   ❌ Race condition was NOT handled correctly\n');
    }

    // Cleanup
    await pool.query(
        `DELETE FROM application_status_log 
         WHERE application_id IN (
             SELECT id FROM applications WHERE job_id = $1
         )`,
        [jobId]
    );
    await pool.query(
        `DELETE FROM applications WHERE job_id = $1`,
        [jobId]
    );
    await pool.query(
        `DELETE FROM job_openings WHERE id = $1`,
        [jobId]
    );

    console.log('🧹 Cleaned up test data\n');
    pool.end();
}

async function applyWithLocking(jobId, applicant) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // This is the key — FOR UPDATE locks the job row
        // Only ONE transaction can hold this lock at a time
        const jobResult = await client.query(
            `SELECT id, active_capacity 
             FROM job_openings 
             WHERE id = $1 
             FOR UPDATE`,
            [jobId]
        );

        const job = jobResult.rows[0];

        const countResult = await client.query(
            `SELECT COUNT(*) as count 
             FROM applications 
             WHERE job_id = $1 
             AND status IN ('active', 'pending_acknowledgment')`,
            [jobId]
        );

        const activeCount = parseInt(countResult.rows[0].count);
        let status;
        let waitlistPosition = null;

        if (activeCount < job.active_capacity) {
            status = 'active';
        } else {
            status = 'waitlisted';
            const maxPosResult = await client.query(
                `SELECT COALESCE(MAX(waitlist_position), 0) as max_pos 
                 FROM applications 
                 WHERE job_id = $1 AND status = 'waitlisted'`,
                [jobId]
            );
            waitlistPosition = parseInt(maxPosResult.rows[0].max_pos) + 1;
        }

        const appResult = await client.query(
            `INSERT INTO applications 
             (job_id, applicant_name, applicant_email, 
              status, waitlist_position, applied_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [jobId, applicant.name, applicant.email, 
             status, waitlistPosition]
        );

        await client.query('COMMIT');
        return appResult.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

runConcurrencyTest().catch(console.error);