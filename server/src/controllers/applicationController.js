const pipelineService = require('../services/pipelineService');
const pool = require('../db/pool');

const applicationController = {
    async apply(req, res) {
        try {
            const { jobId, applicantName, applicantEmail } = req.body;

            if (!jobId || !applicantName || !applicantEmail) {
                return res.status(400).json({
                    error: 'jobId, applicantName, and applicantEmail are required',
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(applicantEmail)) {
                return res.status(400).json({ 
                    error: 'Invalid email format' 
                });
            }

            const application = await pipelineService.applyToJob(
                jobId,
                applicantName.trim(),
                applicantEmail.trim().toLowerCase()
            );

            res.status(201).json({ data: application });
        } catch (error) {
            if (
                error.message.includes('already applied') ||
                error.message.includes('not found') ||
                error.message.includes('not accepting')
            ) {
                return res.status(400).json({ error: error.message });
            }
            console.error('Error submitting application:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getStatus(req, res) {
        try {
            const { id } = req.params;
            const status = await pipelineService.getApplicationStatus(id);
            res.json({ data: status });
        } catch (error) {
            if (error.message === 'Application not found') {
                return res.status(404).json({ error: error.message });
            }
            console.error('Error getting status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getHistory(req, res) {
        try {
            const { id } = req.params;
            const history = await pipelineService.getApplicationHistory(id);
            res.json({ data: history });
        } catch (error) {
            console.error('Error getting application history:', {
            applicationId: req.params.id,
            error: error.message,
            stack: error.stack,
        });
        res.status(500).json({
            error: 'Failed to retrieve application history',
            details: process.env.NODE_ENV === 'development' 
                ? error.message : undefined,
        });
        }
    }, 
        

    async exit(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({
                    error: 'Exit reason is required (hired, rejected, withdrawn)',
                });
            }

            const result = await pipelineService.exitPipeline(id, reason);
            res.json({ data: result });
        } catch (error) {
            if (
                error.message.includes('not found') ||
                error.message.includes('Cannot exit')
            ) {
                return res.status(400).json({ error: error.message });
            }
            console.error('Error exiting pipeline:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async acknowledge(req, res) {
        try {
            const { id } = req.params;
            const result = await pipelineService.acknowledgePromotion(id);
            res.json({ data: result });
        } catch (error) {
            if (
                error.message.includes('not found') ||
                error.message.includes('Cannot acknowledge')
            ) {
                return res.status(400).json({ error: error.message });
            }
            console.error('Error acknowledging:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async lookupByEmail(req, res) {
        try {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({
                    error: 'Email query parameter is required',
                });
            }

        const applications = await pipelineService.lookupByEmail(
            email.trim().toLowerCase()
        );

            res.json({ data: applications });
        } catch (error) {
            console.error('Error looking up applications by email::', {
                email: req.query.email,
            error: error.message,
            stack: error.stack,
        });
        res.status(500).json({
            error: 'Failed to look up applications',
            details: process.env.NODE_ENV === 'development' 
                ? error.message : undefined,
        });
        }
    },
};

module.exports = applicationController;