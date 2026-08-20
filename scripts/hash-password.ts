import { hashPassword } from '../server/utils/auth'

const password = process.argv[2]
if (!password) {
  console.error('用法：npm run password:hash -- "至少 12 个字符的密码"')
  process.exit(1)
}

console.log(hashPassword(password))
