import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { createQueryBuilder, getConnection, getRepository } from "typeorm";
import { Tag } from "../../entity/tag";
import { User } from "../../entity/user";
import { Comment } from "../../entity/comment";
import { Wine } from "../../entity/wine";
import { resolve } from "path";

dotenv.config();

const userinfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRepository = getRepository(User);
    const wineRepository = getRepository(Wine);
    const user = await userRepository.findOne({
      where: { id: 7 }, //req.session!.passport!.user
      relations: ["tags", "good", "bad", "wines"],
    });

    if (user) {
      let wineResult: Wine[] = [];

      for (let wine of user.wines) {
        let result = await wineRepository.findOne({
          where: { id: wine.id },
          relations: ["tags"],
        });
        if (result) {
          wineResult.push(result);
        }
      }
      console.log(wineResult);
      return res.status(200).send({
        data: {
          userInfo: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            image: user.image,
            likes: user.likes,
            bad: user.bad,
            good: user.good,
            tags: user.tags,
            wines: wineResult,
          },
        },
        message: "ok",
      });
    }
  } catch (error) {
    console.error(error.message);
    res.status(401).send({ data: null, message: "not authorized" });
  }
};

export default userinfo;
