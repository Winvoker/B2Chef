// Development utility to validate module structure
import { CONFIG } from './config.js';

class ModuleValidator {
    static async validateModules() {
        console.log('🔍 Validating modular structure...');

        // Check if all modules are accessible
        const tests = [
            { name: 'Config loaded', test: () => CONFIG !== undefined },
            { name: 'API endpoints defined', test: () => CONFIG.API && Object.keys(CONFIG.API).length > 0 },
            { name: 'UI config defined', test: () => CONFIG.UI && CONFIG.UI.SIDEBAR_MIN_WIDTH },
            { name: 'Messages defined', test: () => CONFIG.MESSAGES && CONFIG.MESSAGES.ERROR_GENERAL },
        ];

        const results = tests.map(({ name, test }) => {
            try {
                const passed = test();
                return { name, passed, error: null };
            } catch (error) {
                return { name, passed: false, error: error.message };
            }
        });

        // Log results
        results.forEach(({ name, passed, error }) => {
            const icon = passed ? '✅' : '❌';
            console.log(`${icon} ${name}`);
            if (error) console.log(`   Error: ${error}`);
        });

        const allPassed = results.every(r => r.passed);
        if (allPassed) {
            console.log('🎉 All module validations passed!');
        } else {
            console.log('⚠️  Some validations failed. Check the errors above.');
        }

        return allPassed;
    }

    static logModuleStructure() {
        console.log('📦 Module Structure:');
        console.log('├── app.js (Main Application)');
        console.log('├── config.js (Configuration)');
        console.log('├── modules/');
        console.log('│   ├── chat-manager.js');
        console.log('│   ├── conversation-manager.js');
        console.log('│   ├── ui-manager.js');
        console.log('│   └── kitchen-commands.js');
        console.log('└── utils/');
        console.log('    ├── dom-utils.js');
        console.log('    ├── api-utils.js');
        console.log('    └── message-utils.js');
    }
}

// Only run in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.validateModules = () => ModuleValidator.validateModules();
    window.showModuleStructure = () => ModuleValidator.logModuleStructure();

    console.log('🛠️  Development mode detected. Use validateModules() and showModuleStructure() in console.');
}

export default ModuleValidator;
