import { Prisma, PrismaClient } from '@prisma/client'

type SoftModel =
  | 'contactInformation'
  | 'user'
  | 'person'
  | 'system'
  | 'group'
  | 'claim'
  | 'groupInvite'

type SoftDeleteDelegateMap = {
  [K in SoftModel]: PrismaClient[K]
}

type SoftDeleteDelegate = {
  update: (...args: unknown[]) => Promise<unknown>
  updateMany: (...args: unknown[]) => Promise<unknown>
  findFirst: (...args: unknown[]) => Promise<unknown>
  findFirstOrThrow: (...args: unknown[]) => Promise<unknown>
  findMany: (...args: unknown[]) => Promise<unknown>
  findUnique: (...args: unknown[]) => Promise<unknown>
  findUniqueOrThrow: (...args: unknown[]) => Promise<unknown>
}

const softDeleteTargets = new Set<SoftModel>([
  'contactInformation',
  'user',
  'person',
  'system',
  'group',
  'claim',
  'groupInvite',
])

const toSoftModel = (model: string): SoftModel | null => {
  const normalized = (model.charAt(0).toLowerCase() + model.slice(1)) as SoftModel
  return softDeleteTargets.has(normalized) ? normalized : null
}

// Apply soft delete behaviour using Prisma's extension API (replaces legacy $use middleware).
const softDeleteExtension = Prisma.defineExtension((client) => {
  const baseClient = client as unknown as SoftDeleteDelegateMap
  const getDelegate = (model: SoftModel): SoftDeleteDelegate =>
    baseClient[model] as unknown as SoftDeleteDelegate

  return client.$extends({
    query: {
      $allModels: {
        delete({ model, args, query }) {
          const softModel = toSoftModel(model)
          if (!softModel) {
            return query(args)
          }

          const delegate = getDelegate(softModel)
          return delegate.update({
            ...args,
            data: {
              ...('data' in args ? (args as { data?: Record<string, unknown> }).data : {}),
              deleted: true,
            },
          })
        },
        deleteMany({ model, args, query }) {
          const softModel = toSoftModel(model)
          if (!softModel) {
            return query(args)
          }

          const delegate = getDelegate(softModel)
          return delegate.updateMany({
            ...args,
            data: {
              ...('data' in args ? (args as { data?: Record<string, unknown> }).data : {}),
              deleted: true,
            },
          })
        },
        findFirst({ model, args, query }) {
          const softModel = toSoftModel(model)
          if (!softModel || (args.where as Record<string, unknown> | undefined)?.deleted !== undefined) {
            return query(args)
          }

          const constrainedArgs = {
            ...args,
            where: {
              ...(args.where ?? {}),
              deleted: false,
            },
          } as typeof args

          return query(constrainedArgs)
        },
        findFirstOrThrow({ model, args, query }) {
          const softModel = toSoftModel(model)
          if (!softModel || (args.where as Record<string, unknown> | undefined)?.deleted !== undefined) {
            return query(args)
          }

          const constrainedArgs = {
            ...args,
            where: {
              ...(args.where ?? {}),
              deleted: false,
            },
          } as typeof args

          return query(constrainedArgs)
        },
        findMany({ model, args, query }) {
          const softModel = toSoftModel(model)
          if (!softModel || (args.where as Record<string, unknown> | undefined)?.deleted !== undefined) {
            return query(args)
          }

          const constrainedArgs = {
            ...args,
            where: {
              ...(args.where ?? {}),
              deleted: false,
            },
          } as typeof args

          return query(constrainedArgs)
        },
        findUnique({ model, args, query }) {
          const softModel = toSoftModel(model)
          if (!softModel) {
            return query(args)
          }

          const delegate = getDelegate(softModel)
          if ((args.where as Record<string, unknown> | undefined)?.deleted !== undefined) {
            return delegate.findUnique(args)
          }

          return delegate.findFirst({
            ...args,
            where: {
              ...(args.where ?? {}),
              deleted: false,
            },
          })
        },
        findUniqueOrThrow({ model, args, query }) {
          const softModel = toSoftModel(model)
          if (!softModel) {
            return query(args)
          }

          const delegate = getDelegate(softModel)
          if ((args.where as Record<string, unknown> | undefined)?.deleted !== undefined) {
            return delegate.findUniqueOrThrow(args)
          }

          return delegate.findFirstOrThrow({
            ...args,
            where: {
              ...(args.where ?? {}),
              deleted: false,
            },
          })
        },
      },
    },
  })
})

const prisma = new PrismaClient().$extends(softDeleteExtension)

export { prisma }
export default prisma
