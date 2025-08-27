import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Soft delete middleware
prisma.$use(async (params, next) => {
  // Intercept delete operations and convert to update
  if (params.action === 'delete') {
    params.action = 'update'
    params.args['data'] = { deleted: true }
  }
  
  // Intercept deleteMany operations
  if (params.action === 'deleteMany') {
    params.action = 'updateMany'
    if (params.args.data != undefined) {
      params.args.data['deleted'] = true
    } else {
      params.args['data'] = { deleted: true }
    }
  }
  
  // Filter out deleted records for find operations
  if (params.action === 'findUnique' || params.action === 'findFirst') {
    if (params.args.where) {
      params.args.where['deleted'] = false
    } else {
      params.args['where'] = { deleted: false }
    }
  }
  
  if (params.action === 'findMany') {
    if (params.args.where) {
      if (params.args.where.deleted == undefined) {
        params.args.where['deleted'] = false
      }
    } else {
      params.args['where'] = { deleted: false }
    }
  }
  
  return next(params)
})

export { prisma }
export default prisma