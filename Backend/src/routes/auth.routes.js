const express = require('express')
const authController = require('../controllers/auth.controller')
const authMiddleware = require('../middlewares/auth.middleware')

const authRouter = express.Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */

authRouter.post('/register',authController.registerUserController)

authRouter.post('/login',authController.loginUserController)

authRouter.get('/logout',authController.logoutUserController)

authRouter.get('/get-me',authMiddleware.authUser,authController.getMeController)


module.exports = authRouter
