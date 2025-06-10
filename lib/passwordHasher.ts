import crypto from "crypto"

export async function hashPassword(password: string, salt: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {

        crypto.scrypt(password.normalize(), salt, 64, (error, hash) => {
            if (error) reject(error)
            resolve(hash.toString("hex").normalize())
        })
    })
}

export async function comparePasswords(password:string, salt:string, hashedPassword:string): Promise<boolean> {
    // initialize hashed password from stored password in db
    const inputHashedPassword = await hashPassword(password, salt)
    // function for timing safe, to protect from timng safe attacks
   const a = Buffer.from(inputHashedPassword, "hex")
  const b = Buffer.from(hashedPassword, "hex")
  if (a.length !== b.length) {
    // lengths differ — passwords don't match
    return false
  }
  return crypto.timingSafeEqual(a, b)
}

export async function generateSalt(): Promise<string> {
    return crypto.randomBytes(16).toString("hex").normalize()
}