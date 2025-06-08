import crypto from "crypto"

export async function hashPassword(password: string, salt: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {

        crypto.scrypt(password.normalize(), salt, 64, (error, hash) => {
            if (error) reject(error)
            resolve(hash.toString("hex").normalize())
        })
    })
}

export async function generateSalt(): Promise<string> {
    return crypto.randomBytes(16).toString("hex").normalize()
}