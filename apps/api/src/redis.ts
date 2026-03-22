import Redis from 'ioredis'
import { config } from './config'

export const redis = new Redis(config.REDIS_URL)
export const redisSub = new Redis(config.REDIS_URL)

redis.on('error', (err) => console.error('Redis error:', err))
redisSub.on('error', (err) => console.error('Redis sub error:', err))
