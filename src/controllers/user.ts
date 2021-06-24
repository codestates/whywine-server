import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { Tag } from "../entity/tag";
import { User } from "../entity/user";
import { Wine } from "../entity/wine";
require("dotenv").config();

export = {
  update: async (req: Request, res: Response) => {
    try {
      let tags: string[] = [];
      let userId: number;
      if (req.session!.passport!) {
        userId = req.session!.passport!.user;
      } else {
        throw new Error("userId");
      }

      if (req.body.tags !== undefined && req.body.tags.length !== 0) {
        tags = req.body.tags;
      } else {
        throw new Error("tags");
      }

      let userRepo = getRepository(User); // user table
      let tagRepo = getRepository(Tag); // tag table
      const user = await userRepo.findOne({
        where: { id: userId },
        relations: ["tags"],
      });

      if (user) {
        let tagsArr: Tag[] = [];
        for (let tag of tags) {
          const one = await tagRepo.findOne({ name: tag });
          if (one !== undefined) {
            tagsArr.push(one);
          }
        }
        user.tags = tagsArr;
        userRepo
          .save(user, { transaction: false })
          .then((val) => console.log(val))
          .catch((err) => console.error(err));

        res.status(200).send({ message: "ok." });
      } else {
        throw new Error("user");
      }
    } catch (e) {
      if (e.message === "userId") {
        res.status(401).send({ message: "userId not existed" });
      } else if (e.message === "tags") {
        res.status(204).send({ message: "tags not found" }); // 아무런 태그를 선택하지 않은 경우
      } else if (e.messageb === "user") {
        res.status(401).send({ message: "user not existed" });
      }
    }
  },
  like: async (req: Request, res: Response) => {
    try {
      let wineId: number;
      let userId: number;

      if (req.session!.passport!) {
        userId = req.session!.passport!.user;
      } else {
        throw new Error("userId");
      }

      if (req.body.wineId) {
        wineId = req.body.wineId;
      } else {
        throw new Error("wineId");
      }

      const wineRepo = await getRepository(Wine);
      const userRepo = await getRepository(User);

      const wine = await wineRepo.findOne(wineId);
      const user = await userRepo.findOne({
        where: { id: userId },
        relations: ["wines"],
      });
      if (wine && user) {
        if (user.wines.findIndex((wine) => wine.id === wineId) !== -1) {
          throw new Error("already liked");
        }
        wine.likeCount++;
        await wineRepo.save(wine);
        user.wines = [...user.wines, wine];
        await userRepo.save(user);
        res.status(200).send({ message: "ok" });
      } else if (!user) {
        throw new Error("user");
      } else if (!wine) {
        throw new Error("wine");
      }
    } catch (e) {
      if (e.message === "userId") {
        res.status(401).send({ message: "you are unauthorized" });
      } else if (e.message === "wineId") {
        res.status(404).send({ message: "wineId not existed" });
      } else if (e.message === "user") {
        res.status(404).send({ message: "user not existed" });
      } else if (e.message === "wine") {
        res.status(404).send({ message: "wine not existed" });
      } else if (e.message === "already liked") {
        res.status(404).send({ message: "이미 좋아요 누름" });
      }
    }
  },
  unlike: async (req: Request, res: Response) => {
    try {
      let wineId: number;
      let userId: number;

      if (req.session!.passport!) {
        userId = req.session!.passport!.user;
      } else {
        throw new Error("userId");
      }

      if (req.body.wineId) {
        wineId = req.body.wineId;
      } else {
        throw new Error("wineId");
      }

      const wineRepo = await getRepository(Wine);
      const userRepo = await getRepository(User);

      const wine = await wineRepo.findOne({ id: wineId });
      const user = await userRepo.findOne({
        where: { id: userId },
        relations: ["wines"],
      });
      if (wine && user) {
        let wineids = user.wines.findIndex((wine) => wine.id === wineId);
        if (wineids === -1) {
          throw new Error("not in wines");
        }

        user.wines = user.wines.filter((w) => w.id !== wineId);
        await userRepo.save(user);
        wine.likeCount--;
        await wineRepo.save(wine);

        res.status(200).send({ message: "ok" });
      } else if (!user) {
        throw new Error("user");
      } else if (!wine) {
        throw new Error("wine");
      }
    } catch (e) {
      if (e.message === "userId") {
        res.status(401).send({ message: "you are unauthorized" });
      } else if (e.message === "wineId") {
        res.status(404).send({ message: "wineId not existed" });
      } else if (e.message === "user") {
        res.status(404).send({ message: "user not existed" });
      } else if (e.message === "wine") {
        res.status(404).send({ message: "wine not existed" });
      } else if (e.message === "not in wines") {
        res.status(404).send({ message: "안찜한 와인을 취소하고 있어용" });
      }
    }
  },
};
