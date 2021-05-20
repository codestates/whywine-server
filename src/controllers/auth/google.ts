import { Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'
import dotenv from 'dotenv';
import passport from 'passport';
import axios, { AxiosResponse } from "axios";
//import { user } from '../../models/user';
dotenv.config();

const google = async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
}
export default google;