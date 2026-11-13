// Imported first by tests so the in-memory database and test switches are set before other modules load.
process.env.DB_PATH = ':memory:';
process.env.MAIL_OUTBOX = '1';
process.env.ANTHROPIC_API_KEY = 'test';
process.env.OPENAI_API_KEY = 'test';
process.env.REGISTER_LIMIT = '1000';
