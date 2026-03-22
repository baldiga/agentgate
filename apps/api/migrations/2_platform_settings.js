exports.up = (pgm) => {
  pgm.createTable('platform_settings', {
    key: { type: 'varchar(100)', primaryKey: true },
    value: { type: 'text' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable('platform_settings')
}
