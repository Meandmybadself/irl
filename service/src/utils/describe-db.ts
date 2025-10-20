import { describe } from 'vitest'
import { isDatabaseUnavailable } from '../test-setup.js'

type Describe = typeof describe

type DescribeParameters = Parameters<Describe>

export const describeIfDatabase = (...args: DescribeParameters) => {
  const describeImpl = process.env.SKIP_DB_TESTS === 'true' || isDatabaseUnavailable()
    ? describe.skip
    : describe

  return describeImpl(...args)
}
