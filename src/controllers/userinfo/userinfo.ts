import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { getRepository } from "typeorm";
import { User } from "../../entity/user";
import { Wine } from "../../entity/wine";

dotenv.config();

const userinfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let userId: number;
    if (req.session!.passport!.user) {
      userId = req.session!.passport!.user;
    } else {
      throw new Error("userId");
    }
    const userRepository = getRepository(User);
    const wineRepository = getRepository(Wine);
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ["tags", "good", "bad", "wines"],
    });

    if (user) {
      let wineResult: Wine[] = [];

      for (let wine of user.wines) {
        let result = await wineRepository.findOne({
          where: { id: wine.id },
          relations: ["tags"],
        });
        if (result !== undefined) {
          wineResult.push(result);
        }
      }
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
    if (error.message === "userId") {
      res.status(401).send("You are not unauthorized");
    } else {
      console.error(error);
      res.status(500).send("something is wrong");
    }
  }
};

export default userinfo;
