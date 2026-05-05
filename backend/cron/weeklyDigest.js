import cron from 'node-cron';
import { runScheduledDigests } from '../services/digestService.js';

export function startDigestCron() {
    // Runs at minute 0 of every hour — matches orgs by their dayOfWeek + hour UTC settings
    cron.schedule('0 * * * *', async () => {
        console.log('[digest] Running scheduled digest check…');
        try {
            const results = await runScheduledDigests();
            if (results.length) console.log(`[digest] Processed ${results.length} org(s)`);
        } catch (err) {
            console.error('[digest] Cron error:', err.message);
        }
    });
    console.log('[digest] Weekly digest cron scheduled (hourly check)');
}
