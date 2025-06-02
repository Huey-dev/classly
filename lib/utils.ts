 // generating access and refresh token
        const jwt = require("jsonwebtoken");
        const createAccessToken = (email: string) => {
            const token = jwt.sign(email, process.env.JWT_SECRET_KEY, {
                expiresIn: "15m",
            });

            return token;
        };
        const createRefreshToken = (email: string) => {
            const token = jwt.sign(email, process.env.REFRESH_TOKEN_SECRET_KEY, {
                expiresIn: "1d",
            });
            return token;
        };

        module.exports = { createAccessToken, createRefreshToken };