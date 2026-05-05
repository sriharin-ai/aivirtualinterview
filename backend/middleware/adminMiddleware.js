import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';

const adminProtect = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role !== 'admin') {
                res.status(403);
                throw new Error('Not authorised as admin.');
            }
            req.admin = decoded;
            next();
        } catch (error) {
            res.status(401);
            throw new Error('Not authorised, admin token failed.');
        }
    }
    if (!token) {
        res.status(401);
        throw new Error('Not authorised, no token.');
    }
});

export { adminProtect };
