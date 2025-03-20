/**
 * Build information utility for BetterX
 */

/**
 * Interface for build information
 */
interface BuildInfo {
    buildDate: Date;
    buildTimestamp: number;
    version: string;
    formatted: string;
    isValid: boolean;
}

/**
 * Get the build date of the BetterX bundle
 * @returns {BuildInfo} Object containing buildDate (Date object) and formatted date string
 */
export function getBuildInfo(): BuildInfo {
    try {
        const buildDate = new Date(process.env.BUILD_DATE || '');
        const buildTimestamp = parseInt(process.env.BUILD_TIMESTAMP || '0', 10);
        const version = process.env.BUNDLE_VERSION || '0.0.0';
        
        const formatOptions: Intl.DateTimeFormatOptions = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        
        return {
            buildDate,
            buildTimestamp,
            version,
            formatted: buildDate.toLocaleDateString(undefined, formatOptions),
            isValid: !isNaN(buildDate.getTime())
        };
    } catch (error) {
        console.error('Error getting build info:', error);
        return {
            buildDate: new Date(),
            buildTimestamp: Date.now(),
            version: '0.0.0',
            formatted: 'Unknown',
            isValid: false
        };
    }
}

/**
 * Calculate time elapsed since the build
 * @returns {string} Formatted time elapsed since build
 */
export function getTimeSinceBuild(): string {
    try {
        const buildInfo = getBuildInfo();
        if (!buildInfo.isValid) return 'Unknown';
        
        const now = Date.now();
        const diffMs = now - buildInfo.buildTimestamp;
        
        // Less than a minute
        if (diffMs < 60000) {
            return 'Just now';
        }
        
        // Less than an hour
        if (diffMs < 3600000) {
            const minutes = Math.floor(diffMs / 60000);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        }
        
        // Less than a day
        if (diffMs < 86400000) {
            const hours = Math.floor(diffMs / 3600000);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        }
        
        // Days
        const days = Math.floor(diffMs / 86400000);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    } catch (error) {
        console.error('Error calculating time since build:', error);
        return 'Unknown';
    }
}

/**
 * Get the bundle version
 * @returns {string} The version of the BetterX bundle
 */
export function getBundleVersion(): string {
    try {
        return process.env.BUNDLE_VERSION || '0.0.0';
    } catch (error) {
        console.error('Error getting bundle version:', error);
        return '0.0.0';
    }
}
