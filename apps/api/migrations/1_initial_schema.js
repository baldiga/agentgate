exports.up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS vector')

  pgm.createTable('roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true, unique: true },
    slug: { type: 'varchar(100)', notNull: true, unique: true },
    is_superadmin: { type: 'boolean', notNull: true, default: false },
    mfa_required: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    name: { type: 'varchar(255)', notNull: true },
    password_hash: { type: 'text' },
    mfa_secret: { type: 'text' },
    mfa_enabled: { type: 'boolean', notNull: true, default: false },
    auth_provider: { type: 'varchar(50)', notNull: true, default: "'local'" },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('user_roles', {
    user_id: { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: '"roles"', onDelete: 'CASCADE' },
  })
  pgm.addConstraint('user_roles', 'user_roles_pkey', 'PRIMARY KEY (user_id, role_id)')

  pgm.createTable('agents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    slug: { type: 'varchar(100)', notNull: true, unique: true },
    description: { type: 'text' },
    icon: { type: 'varchar(10)', default: "'🤖'" },
    status: { type: 'varchar(20)', notNull: true, default: "'offline'" },
    timeout_seconds: { type: 'integer', notNull: true, default: 30 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('sdk_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    agent_id: { type: 'uuid', notNull: true, references: '"agents"', onDelete: 'CASCADE' },
    token_hash: { type: 'text', notNull: true },
    previous_token_hash: { type: 'text' },
    grace_period_expires_at: { type: 'timestamptz' },
    label: { type: 'varchar(255)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('agent_role_permissions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    agent_id: { type: 'uuid', notNull: true, references: '"agents"', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: '"roles"', onDelete: 'CASCADE' },
    actions: { type: 'text[]', notNull: true, default: pgm.func("'{}'") },
  })
  pgm.addConstraint('agent_role_permissions', 'arp_unique', 'UNIQUE (agent_id, role_id)')

  pgm.createTable('channels', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    agent_id: { type: 'uuid', notNull: true, references: '"agents"', onDelete: 'CASCADE' },
    created_by: { type: 'uuid', notNull: true, references: '"users"' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('channel_roles', {
    channel_id: { type: 'uuid', notNull: true, references: '"channels"', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: '"roles"', onDelete: 'CASCADE' },
  })
  pgm.addConstraint('channel_roles', 'channel_roles_pkey', 'PRIMARY KEY (channel_id, role_id)')

  pgm.createTable('threads', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    agent_id: { type: 'uuid', notNull: true, references: '"agents"', onDelete: 'CASCADE' },
    type: { type: 'varchar(10)', notNull: true, default: "'private'" },
    channel_id: { type: 'uuid', references: '"channels"', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('messages', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    thread_id: { type: 'uuid', notNull: true, references: '"threads"', onDelete: 'CASCADE' },
    sender_type: { type: 'varchar(10)', notNull: true },
    sender_id: { type: 'uuid' },
    content_encrypted: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('agent_sources', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    agent_id: { type: 'uuid', notNull: true, references: '"agents"', onDelete: 'CASCADE' },
    type: { type: 'varchar(20)', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    config_encrypted: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('source_chunks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    source_id: { type: 'uuid', notNull: true, references: '"agent_sources"', onDelete: 'CASCADE' },
    chunk_text: { type: 'text', notNull: true },
    embedding: { type: 'vector(1536)' },
    chunk_index: { type: 'integer', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createTable('audit_log', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: '"users"' },
    role_snapshot: { type: 'text[]' },
    agent_id: { type: 'uuid', references: '"agents"' },
    thread_id: { type: 'uuid' },
    action: { type: 'varchar(50)', notNull: true },
    content_encrypted: { type: 'text' },
    outcome: { type: 'varchar(20)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex('messages', 'thread_id')
  pgm.createIndex('audit_log', 'user_id')
  pgm.createIndex('audit_log', 'agent_id')
  pgm.createIndex('audit_log', 'created_at')
  pgm.createIndex('agent_sources', 'agent_id')
  pgm.createIndex('source_chunks', 'source_id')
  pgm.sql('CREATE INDEX source_chunks_embedding_idx ON source_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)')
}

exports.down = (pgm) => {
  pgm.dropTable('source_chunks')
  pgm.dropTable('agent_sources')
  pgm.dropTable('audit_log')
  pgm.dropTable('messages')
  pgm.dropTable('threads')
  pgm.dropTable('channel_roles')
  pgm.dropTable('channels')
  pgm.dropTable('agent_role_permissions')
  pgm.dropTable('sdk_tokens')
  pgm.dropTable('agents')
  pgm.dropTable('user_roles')
  pgm.dropTable('users')
  pgm.dropTable('roles')
  pgm.sql('DROP EXTENSION IF EXISTS vector')
}
