import { Request, Response, NextFunction } from "express";

import dotenv from "dotenv";
import { getRepository } from "typeorm";
import { User } from "../../entity/user";
const AWS = require("aws-sdk");
dotenv.config();
AWS.config.update({
  // aws 설정
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: "ap-northeast-2",
});
const s3 = new AWS.S3();

interface fileInterface {
  fieldname?: string;
  originalname?: string;
  encoding?: string;
  mimetype?: string;
  size?: number;
  bucket?: string;
  key?: string;
  acl?: string;
  contentType?: string;
  storageClass?: string;
  metadata?: {};
  location?: string;
  etag?: string;
}
const profileImage = {
  upload: async (req: Request, res: Response) => {
    try {
      let userId: number;
      if (req.session!.passport !== undefined) {
        userId = req.session.passport.user;
      } else {
        throw new Error("userId");
      }
      const fileObj: fileInterface = req.file;

      if (!fileObj || !fileObj.key) {
        throw new Error("upload");
      }

      const userRepo = await getRepository(User);
      let user = await userRepo.findOne(userId);

      if (user) {
      } else {
        throw new Error("user");
      }
      if (user.image) {
        await s3.deleteObject(
          {
            Bucket: "whywineimg",
            Key: "user/" + user.image,
          },
          (err: any, data: any) => {
            if (err) {
              throw new Error("delete old");
            }
          }
        );
      }

      user.image = fileObj.key.split("/")[1];
      let updatedUser = await userRepo.save(user);

      res.status(200).send({ message: "ok", data: { user: updatedUser } });
    } catch (e) {
      if (e.message === "userId") {
        res.status(401).send({ message: "You are unauthorized." });
      } else if (e.message === "user") {
        res.status(401).send({ message: "user not existed" });
      } else if (e.message === "upload") {
        res.status(500).send({ message: "upload failed" });
      } else if (e.message === "delete old") {
        res.status(500).send({ message: "failed to delete old image" });
      }
    }
  },
};

export default profileImage;
