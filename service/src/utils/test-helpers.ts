import { faker } from '@faker-js/faker'

// Helper function to filter out undefined values
const filterUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const entries = Object.entries(obj).filter(([, value]) => value !== undefined)
  return Object.fromEntries(entries) as T
}

export const generateTestData = {
  user: () => ({
    email: faker.internet.email(),
    password: '$2b$10$testhashedpasswordforunitests' // Pre-hashed 'password' for testing
  }),

  person: (userId: number) => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    displayId: faker.internet.username().toLowerCase() + '-' + Math.random().toString(36).substring(2, 8),
    pronouns: faker.helpers.arrayElement(['he/him', 'she/her', 'they/them', 'xe/xem']),
    userId
  }),

  system: () => ({
    name: faker.company.name() + ' Organization',
    registrationOpen: faker.datatype.boolean()
  }),

  group: (parentGroupId?: number) => filterUndefined({
    displayId: faker.lorem.slug() + '-' + Math.random().toString(36).substring(2, 6),
    name: faker.company.buzzNoun() + ' ' + faker.company.buzzAdjective(),
    description: faker.lorem.sentences(2),
    parentGroupId: parentGroupId,
    allowsAnyUserToCreateSubgroup: faker.datatype.boolean(),
    publiclyVisible: faker.datatype.boolean()
  }),

  contactInfo: () => ({
    type: faker.helpers.arrayElement(['EMAIL', 'PHONE', 'ADDRESS', 'URL'] as const),
    label: faker.helpers.arrayElement(['Personal', 'Work', 'Home', 'Mobile', 'Other']),
    value: faker.helpers.arrayElement([
      faker.internet.email(),
      faker.phone.number(),
      faker.location.streetAddress(),
      faker.internet.url()
    ]),
    privacy: faker.helpers.arrayElement(['PRIVATE', 'PUBLIC'] as const)
  }),

  claim: (personId: number, requestingUserId: number) => ({
    personId,
    requestingUser: requestingUserId,
    claimCode: Math.random().toString(36).substring(2, 15),
    expiresAt: faker.date.future()
  }),

  personGroupRelation: () => faker.helpers.arrayElement([
    'PARENT', 'TEACHER', 'COACH', 'MEMBER', 'ADMIN', 'VOLUNTEER', 'STUDENT'
  ])
}

export const createRandomEmail = () => faker.internet.email()
export const createRandomName = () => ({
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName()
})

// Database availability checker
export const isDatabaseAvailable = async (): Promise<boolean> => {
  try {
    const { prisma } = await import('../lib/prisma.js')
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
