const cron = require('node-cron');
const { executeQuery, pool } = require('../config/database');

class GlobalDisableScheduler {
  constructor() {
    this.disableTask = null;
    this.enableTask = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('Initializing Global Disable Scheduler...');
      
      // Check if system_settings table exists
      try {
        await executeQuery('SELECT 1 FROM system_settings LIMIT 1');
      } catch (error) {
        console.log('System settings table not found. Skipping scheduler initialization.');
        return;
      }
      
      await this.updateSchedule();
      this.isInitialized = true;
      console.log('✓ Global Disable Scheduler initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Global Disable Scheduler:', error.message);
    }
  }

  async updateSchedule() {
    try {
      // Get current settings
      const settings = await this.getSettings();
      
      // Stop existing tasks
      this.stopTasks();
      
      if (!settings.enabled) {
        console.log('Global disable time is disabled');
        return;
      }
      
      // Parse times
      const disableTime = this.parseTime(settings.disableTime);
      const enableTime = this.parseTime(settings.enableTime);
      
      if (!disableTime || !enableTime) {
        console.error('Invalid time format in settings');
        return;
      }
      
      // Create cron expressions (runs daily)
      const disableCron = `${disableTime.second} ${disableTime.minute} ${disableTime.hour} * * *`;
      const enableCron = `${enableTime.second} ${enableTime.minute} ${enableTime.hour} * * *`;
      
      console.log(`Scheduling disable at: ${settings.disableTime} (${disableCron})`);
      console.log(`Scheduling enable at: ${settings.enableTime} (${enableCron})`);
      
      // Schedule disable task
      this.disableTask = cron.schedule(disableCron, async () => {
        await this.executeGlobalAction('disable', 'scheduled');
      }, {
        scheduled: true,
        timezone: settings.timezone || 'UTC'
      });
      
      // Schedule enable task
      this.enableTask = cron.schedule(enableCron, async () => {
        await this.executeGlobalAction('enable', 'scheduled');
      }, {
        scheduled: true,
        timezone: settings.timezone || 'UTC'
      });
      
      console.log('✓ Global disable/enable tasks scheduled successfully');
      
    } catch (error) {
      console.error('❌ Failed to update schedule:', error.message);
    }
  }

  async getSettings() {
    const settingsKeys = [
      'global_disable_time_enabled',
      'global_disable_time',
      'global_enable_time',
      'global_disable_timezone',
      'global_disable_action'
    ];
    
    const settings = {};
    
    for (const key of settingsKeys) {
      try {
        const [result] = await executeQuery(
          'SELECT setting_value FROM system_settings WHERE setting_key = ?',
          [key]
        );
        
        if (result.length > 0) {
          let value = result[0].setting_value;
          
          // Convert boolean strings
          if (key === 'global_disable_time_enabled') {
            value = value === 'true';
          }
          
          settings[this.camelCase(key.replace('global_', ''))] = value;
        }
      } catch (error) {
        console.error(`Failed to get setting ${key}:`, error.message);
      }
    }
    
    return {
      enabled: settings.disableTimeEnabled || false,
      disableTime: settings.disableTime || '00:00:00',
      enableTime: settings.enableTime || '06:00:00',
      timezone: settings.disableTimezone || 'UTC',
      action: settings.disableAction || 'hide'
    };
  }

  parseTime(timeString) {
    const match = timeString.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (!match) return null;
    
    return {
      hour: parseInt(match[1]),
      minute: parseInt(match[2]),
      second: parseInt(match[3])
    };
  }

  camelCase(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  async executeGlobalAction(action, triggerType = 'scheduled') {
    const connection = await pool.getConnection();
    try {
      console.log(`Executing global ${action} (${triggerType})...`);
      
      await connection.beginTransaction();
      
      let affectedProducts = 0;
      let affectedCategories = 0;
      
      if (action === 'disable') {
        // Store original states and disable all products
        const [productResult] = await connection.execute(`
          UPDATE products 
          SET original_is_active = is_active, is_active = 0 
          WHERE is_active = 1
        `);
        
        const [categoryResult] = await connection.execute(`
          UPDATE categories 
          SET original_is_active = is_active, is_active = 0 
          WHERE is_active = 1
        `);
        
        affectedProducts = productResult.affectedRows;
        affectedCategories = categoryResult.affectedRows;
        
      } else if (action === 'enable') {
        // Restore original states
        const [productResult] = await connection.execute(`
          UPDATE products 
          SET is_active = COALESCE(original_is_active, 1), original_is_active = NULL 
          WHERE original_is_active IS NOT NULL
        `);
        
        const [categoryResult] = await connection.execute(`
          UPDATE categories 
          SET is_active = COALESCE(original_is_active, 1), original_is_active = NULL 
          WHERE original_is_active IS NOT NULL
        `);
        
        affectedProducts = productResult.affectedRows;
        affectedCategories = categoryResult.affectedRows;
      }
      
      // Log the action
      await connection.execute(`
        INSERT INTO global_disable_logs 
          (action, trigger_type, affected_products, affected_categories, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [
        action === 'disable' ? 'disabled' : 'enabled',
        triggerType,
        affectedProducts,
        affectedCategories,
        `Automatic ${action} triggered by schedule`
      ]);
      
      await connection.commit();
      
      console.log(`✓ Global ${action} completed - Products: ${affectedProducts}, Categories: ${affectedCategories}`);
      
    } catch (error) {
      await connection.rollback();
      console.error(`❌ Failed to execute global ${action}:`, error.message);
      
      // Log the error
      try {
        await executeQuery(`
          INSERT INTO global_disable_logs 
            (action, trigger_type, affected_products, affected_categories, notes)
          VALUES (?, ?, 0, 0, ?)
        `, ['error', triggerType, `Failed to ${action}: ${error.message}`]);
      } catch (logError) {
        console.error('Failed to log error:', logError.message);
      }
      
      throw error;
    } finally {
      connection.release();
    }
  }

  stopTasks() {
    if (this.disableTask) {
      this.disableTask.stop();
      this.disableTask = null;
    }
    
    if (this.enableTask) {
      this.enableTask.stop();
      this.enableTask = null;
    }
    
    console.log('Global disable tasks stopped');
  }

  async manualTrigger(action, adminUserId = null, notes = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      let affectedProducts = 0;
      let affectedCategories = 0;
      
      if (action === 'disable') {
        const [productResult] = await connection.execute(`
          UPDATE products 
          SET original_is_active = is_active, is_active = 0 
          WHERE is_active = 1
        `);
        
        const [categoryResult] = await connection.execute(`
          UPDATE categories 
          SET original_is_active = is_active, is_active = 0 
          WHERE is_active = 1
        `);
        
        affectedProducts = productResult.affectedRows;
        affectedCategories = categoryResult.affectedRows;
        
      } else if (action === 'enable') {
        const [productResult] = await connection.execute(`
          UPDATE products 
          SET is_active = COALESCE(original_is_active, 1), original_is_active = NULL 
          WHERE original_is_active IS NOT NULL
        `);
        
        const [categoryResult] = await connection.execute(`
          UPDATE categories 
          SET is_active = COALESCE(original_is_active, 1), original_is_active = NULL 
          WHERE original_is_active IS NOT NULL
        `);
        
        affectedProducts = productResult.affectedRows;
        affectedCategories = categoryResult.affectedRows;
      }
      
      // Log the action
      await connection.execute(`
        INSERT INTO global_disable_logs 
          (action, trigger_type, affected_products, affected_categories, admin_user_id, notes)
        VALUES (?, 'manual', ?, ?, ?, ?)
      `, [
        action === 'disable' ? 'disabled' : 'enabled',
        affectedProducts,
        affectedCategories,
        adminUserId,
        notes
      ]);
      
      await connection.commit();
      
      console.log(`✓ Manual global ${action} completed`);
      return { affectedProducts, affectedCategories };
      
    } catch (error) {
      await connection.rollback();
      console.error(`❌ Manual global ${action} failed:`, error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      disableTaskActive: this.disableTask ? this.disableTask.getStatus() : 'stopped',
      enableTaskActive: this.enableTask ? this.enableTask.getStatus() : 'stopped'
    };
  }
}

// Create singleton instance
const globalDisableScheduler = new GlobalDisableScheduler();

module.exports = globalDisableScheduler;
