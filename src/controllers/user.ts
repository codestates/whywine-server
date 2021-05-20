import { Request, Response } from "express";
import { createConnection } from "typeorm";
import ormconfig from "../../ormconfig";
import { Tag } from "../entity/tag";
import { User } from "../entity/user";
import { Comment } from "../entity/comment";
import { Wine } from "../entity/wine";
import jwt from "jsonwebtoken";
require("dotenv").config();

export = {
  update: async (req: Request, res: Response) => {
    interface TokenInterface {
      // verified accessToken의 인터페이스
      id: number;
      email: string;
      nickname: string;
      likes?: number;
      image?: Buffer;
      tags: Tag[];
      good?: Comment[];
      bad?: Comment[];
      wines?: Wine[];
    }
    const connection = await createConnection(ormconfig); // 데이터베이스와 연결

    const tags: string[] = req.body.tags;
    const accessToken: string = req.body.accessToken;
    const { id } = jwt.verify(
      // accessToken으로부터 유저 id를 빼내온다
      accessToken,
      process.env.ACCTOKEN_SECRET!
    ) as TokenInterface;

    let userRepo = connection.getRepository(User); // user table
    let tagRepo = connection.getRepository(Tag); // tag table

    const user = await userRepo.findOne({ id });

    // user가 있는 경우
    if (user !== undefined) {
      let tagsArr: Tag[] = [];
      for (let tag of tags) {
        // tag 레포에서 tag들을 찾아 tagsArr에 저장
        const one = await tagRepo.findOne({ name: tag });
        if (one !== undefined) {
          await tagsArr.push(one);
        }
      }
      user.tags = [...tagsArr]; // 찾은 tag들을 user_tag를 통해 user와 연결
      await connection.manager.save(user);

      if (tagsArr.length === 0) {
        res.status(204).send({ message: "tags not found" }); // 아무런 태그를 선택하지 않은 경우
      } else {
        res.status(200).send({ message: "ok." });
      }
    } else {
      // user가 없는 경우
      res.status(401).send({ message: "accessToken not existed" });
    }
  },
};