import { execSync } from 'child_process';

export async function setupTestDatabase() {
  const testDbUrl = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/irl_test';
  const adminDbUrl = process.env.ADMIN_DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres';
  
  try {
    // Extract database connection details from test URL
    const testUrl = new URL(testDbUrl);
    const dbName = testUrl.pathname.slice(1); // Remove leading slash
    const username = testUrl.username;
    const password = testUrl.password;
    const host = testUrl.hostname;
    const port = testUrl.port || '5432';
    
    // Extract admin connection details
    const adminUrl = new URL(adminDbUrl);
    const adminUser = adminUrl.username || 'postgres';
    const adminHost = adminUrl.hostname;
    const adminPort = adminUrl.port || '5432';
    const adminDbName = adminUrl.pathname.slice(1) || 'postgres';
    
    console.log(`Setting up test database: ${dbName} for user: ${username}`);
    
    // Build connection strings for psql
    const adminConnString = `postgresql://${adminUser}@${adminHost}:${adminPort}/${adminDbName}`;
    const adminConnToTestDb = `postgresql://${adminUser}@${adminHost}:${adminPort}/${dbName}`;
    
    // Commands to run via psql
    const commands = [
      // Create user if not exists
      `CREATE USER ${username} WITH PASSWORD '${password}';`,
      // Create database if not exists
      `CREATE DATABASE ${dbName} OWNER ${username};`,
    ];
    
    // Run commands that may fail if resources already exist
    for (const command of commands) {
      try {
        execSync(`psql "${adminConnString}" -c "${command}"`, { 
          stdio: 'pipe',
          encoding: 'utf8'
        });
        console.log(`✓ Executed: ${command}`);
      } catch (error) {
        // Ignore errors for resources that already exist
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`• Skipped (already exists): ${command}`);
        } else {
          console.warn(`• Warning: ${command} - ${error instanceof Error ? error.message : error}`);
        }
      }
    }
    
    // Grant permissions (these should always succeed)
    const permissionCommands = [
      `GRANT ALL PRIVILEGES ON SCHEMA public TO ${username};`,
      `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${username};`,
      `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${username};`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${username};`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${username};`,
    ];
    
    for (const command of permissionCommands) {
      try {
        execSync(`psql "${adminConnToTestDb}" -c "${command}"`, { 
          stdio: 'pipe',
          encoding: 'utf8'
        });
        console.log(`✓ Permission granted: ${command}`);
      } catch (error) {
        console.warn(`• Permission warning: ${command} - ${error instanceof Error ? error.message : error}`);
      }
    }
    
    console.log('✓ Test database setup completed successfully');
    return true;
    
  } catch (error) {
    console.warn('Database setup failed:', error instanceof Error ? error.message : error);
    console.warn('Tests will continue but may fail if database is not properly configured');
    return false;
  }
}

// Allow this script to be run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Set default environment variables for standalone execution
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/irl_test';
  process.env.ADMIN_DATABASE_URL = process.env.ADMIN_DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres';
  
  setupTestDatabase().then((success) => {
    process.exit(success ? 0 : 1);
  });
}