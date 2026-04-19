const pool = require('../db/pool');

const companyController = {
    async create(req, res) {
        try {
            const { name } = req.body;

            if (!name || name.trim().length === 0) {
                return res.status(400).json({ 
                    error: 'Company name is required' 
                });
            }

            const result = await pool.query(
                'INSERT INTO companies (name) VALUES ($1) RETURNING *',
                [name.trim()]
            );

            res.status(201).json({ data: result.rows[0] });
        } catch (error) {
            console.error('Error creating company:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async list(req, res) {
        try {
            const result = await pool.query(
                'SELECT * FROM companies ORDER BY created_at DESC'
            );
            res.json({ data: result.rows });
        } catch (error) {
            console.error('Error listing companies:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;

            const companyResult = await pool.query(
                'SELECT * FROM companies WHERE id = $1', [id]
            );

            if (companyResult.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'Company not found' 
                });
            }

            const jobsResult = await pool.query(
                `SELECT * FROM job_openings 
                 WHERE company_id = $1 
                 ORDER BY created_at DESC`,
                [id]
            );

            res.json({
                data: {
                    ...companyResult.rows[0],
                    jobOpenings: jobsResult.rows,
                },
            });
        } catch (error) {
            console.error('Error getting company:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
};

module.exports = companyController;