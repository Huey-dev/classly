import crypto from "crypto"

export async function hashPassword(password: string, salt: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {

        crypto.scrypt(password.normalize(), salt, 64, (error, hash) => {
            if (error) reject(error)
            resolve(hash.toString("hex").normalize())
        })
    })
}

export async function comparePasswords(password:string, salt:string, hashedPassword:string) {
    const inputHashedPassword = await hashPassword(password, salt)
    // function for timing safe, to protect from timng safe attacks
    return crypto.timingSafeEqual(
        Buffer.from(inputHashedPassword, "hex"),
        Buffer.from(hashedPassword, "hex")
    )
}

export async function generateSalt(): Promise<string> {
    return crypto.randomBytes(16).toString("hex").normalize()
}