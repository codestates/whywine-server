import { Request, Response } from "express";
import { getConnection, getRepository } from "typeorm";
import { Comment } from "../entity/comment";
import { Wine } from "../entity/wine";
import { User } from "../entity/user";
import { Recomment } from "../entity/recomment";

require("dotenv").config();

interface CommentInterface {
  id: number;
  text: string;
  user?: UserInterface;
  wineId?: number;
  good_count: number;
  bad_count: number;
  recomments?: RecommentInterface[];
  rating?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
interface RecommentInterface {
  id: number;
  text: string;
  user: UserInterface;
}
interface UserInterface {
  id: number;
  nickname: string;
  image: string;
}
export = {
  post: async (req: Request, res: Response) => {
    try {
      const userRepo = await getRepository(User);
      const wineRepo = await getRepository(Wine);
      const commentRepo = await getRepository(Comment);
      const { wineId, text, rating } = req.body;

      let userId: number;

      if (req.session!.passport!.user) {
        userId = req.session!.passport!.user;
      } else {
        throw new Error("userId");
      }

      if (!wineId) {
        throw new Error("wineId");
      }

      if (!text) {
        throw new Error("text");
      }

      if (!rating) {
        throw new Error("rating");
      }

      const user = await userRepo.findOne({ id: userId }); // 3 => userId
      const wine = await wineRepo.findOne({ id: wineId });
      if (!user) {
        throw new Error("user");
      } else if (!wine) {
        throw new Error("wine");
      } else {
        // 새로운 코멘트 저장
        let comment = new Comment();
        comment.text = text;
        comment.user = user;
        comment.wine = wine;
        comment.good_count = 0;
        comment.bad_count = 0;
        comment.rating = rating;
        const newComment = await commentRepo.save(comment);
        // 와인 rating_avg 갱신
        const comments = await commentRepo.find({
          where: { wine: wineId },
        });

        let newRatingAvg =
          comments.reduce((acc, cur) => {
            return acc + cur.rating;
          }, 0) / comments.length;

        await wineRepo.update(wineId, {
          rating_avg: newRatingAvg,
        });
        res.status(200).send({
          data: {
            newComment,
          },
          message: "ok.",
        });
        return;
      }
    } catch (e) {
      if (e.message === "userId") {
        res.status(404).send({ message: "userId not existed" });
      } else if (e.message === "wineId") {
        res.status(404).send({ message: "wineId not existed" });
      } else if (e.message === "text") {
        res.status(404).send({ message: "text is empty" });
      } else if (e.message === "rating") {
        res.status(404).send({ message: "rating is empty" });
      } else if (e.message === "user") {
        res.status(404).send({ message: "user not existed" });
      } else if (e.message === "wine") {
        res.status(404).send({ message: "wine not existed" });
      } else {
        res.status(404).send({ message: "something wrong" });
      }
    }
  },
  get: async (req: Request, res: Response) => {
    try {
      const userRepo = await getRepository(User);
      const wineRepo = await getRepository(Wine);
      const commentRepo = await getRepository(Comment);
      const recommentRepo = await getRepository(Recomment);

      const wineId: number = Number(req.query.wineid);
      let userId: number;
      let user: User;

      if (req.session.passport) {
        userId = req.session!.passport!.user;
      } else {
        userId = -1; // 비회원
      }

      let usersgood: number[] = [];
      let usersbad: number[] = [];

      if (userId !== -1) {
        // 회원인 경우, 회원이 좋아요/싫어요 누른 리뷰의 아이디를 배열에 추가
        let result = await userRepo.findOne({
          where: { id: userId }, // 3=>userId
          relations: ["good", "bad"],
        });

        if (result) {
          user = result;
          if (userId !== -1) {
            usersgood = user.good.map((comment) => comment.id);
            usersbad = user.bad.map((comment) => comment.id);
          }
        } else {
          throw new Error("user");
        }
      }
      const wine = await wineRepo.findOne(wineId);
      if (wine) {
        let comments: Comment[] = await commentRepo.find({
          where: { wine: wineId },
          relations: ["user", "wine"],
        });
        let results: CommentInterface[] = [];
        for (let c of comments) {
          let user: UserInterface = {
            id: c.user.id,
            nickname: c.user.nickname,
            image: c.user.image,
          };
          let recomments: RecommentInterface[] = [];
          let result = (
            await recommentRepo.find({
              where: { comment: c.id },
              relations: ["user"],
            })
          ).map((el) => {
            return {
              id: el.id,
              text: el.text,
              user: {
                id: el.user.id,
                nickname: el.user.nickname,
                image: el.user.image,
              },
            };
          });
          if (!result) {
            recomments = result;
          } else {
            recomments = [];
          }

          let res: CommentInterface = {
            id: c.id,
            text: c.text,
            user: user,
            wineId: c.wine.id,
            good_count: c.good_count,
            bad_count: c.bad_count,
            rating: c.rating,
            recomments: recomments,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          };
          results.push(res);
        }
        results.reverse();
        res.status(200).send({
          data: {
            comments: results,
            usersgood,
            usersbad,
          },
          message: "ok.",
        });
      } else {
        throw new Error("no wine");
      }
    } catch (err) {
      console.log(err);
      if (err.message === "user") {
        res.status(401).send({ message: "user not found." });
      } else if (err.message === "no wine") {
        res.status(404).send({ message: "wineId not found." });
      }
    }
  },
  delete: async (req: Request, res: Response) => {
    try {
      let commentId: number;
      let userId: number;

      if (req.session.passport) {
        userId = req.session.passport.user;
      } else {
        throw new Error("userId");
      }

      if (req.body.commentId) {
        commentId = req.body.commentId;
      } else {
        throw new Error("commentId");
      }

      const wineRepo = await getRepository(Wine);
      const commentRepo = await getRepository(Comment);
      const recommentRepo = await getRepository(Recomment);
      const comment = await commentRepo.findOne({
        where: { id: commentId },
        relations: ["user", "wine"],
      });
      if (comment) {
        if (comment.user.id === userId) {
          await recommentRepo
            .createQueryBuilder()
            .delete()
            .from(Recomment)
            .where("comment = :commentId", { commentId })
            .execute();

          await commentRepo.delete(commentId);

          const wine = await wineRepo.findOne({
            where: { id: comment.wine.id },
          });

          if (wine) {
            const comments = await commentRepo.find({
              where: { wine: wine.id },
            });

            let rating_avg = 0;
            if (comments.length !== 0) {
              rating_avg =
                comments.reduce((acc, cur) => {
                  return acc + cur.rating;
                }, 0) / comments.length;
            }

            await wineRepo.update(wine.id, { rating_avg });
          }
          res.status(200).send({ message: "comment successfully deleted." });
        } else {
          throw new Error("user");
        }
      } else {
        throw new Error("comment");
      }
    } catch (e) {
      if (e.message === "userId") {
        res.status(401).send({ message: "you are unauthorized." });
      } else if (e.message === "commentId") {
        res.status(404).send({ message: "commentId not existed." });
      } else if (e.message === "user") {
        res.status(401).send({ message: "you are not writer." });
      } else if (e.message === "comment") {
        res.status(404).send({ message: "comment not existed." });
      }
    }
  },
  put: async (req: Request, res: Response) => {
    try {
      const { text, commentId, rating } = req.body;
      let userId: number;

      if (req.session!.passport!.user) {
        userId = req.session!.passport!.user;
      } else {
        throw new Error("userId");
      }
      if (!commentId) {
        throw new Error("commentId");
      }

      if (!text && !rating) {
        throw new Error("text&&rating");
      }

      const commentRepo = await getRepository(Comment);
      const wineRepo = await getRepository(Wine);
      const comment = await commentRepo.findOne({
        where: { id: commentId },
        relations: ["user", "wine"],
      });
      if (comment) {
        if (comment.user.id === userId) {
          if (text) {
            await commentRepo.update(commentId, { text });
          }
          if (rating) {
            await commentRepo.update(commentId, { rating });

            const comments = await commentRepo.find({
              where: { wine: comment.wine },
            });
            let newRatingAvg =
              comments.reduce((acc, cur) => {
                return acc + cur.rating;
              }, 0) / comments.length;
            await wineRepo.update(comment.wine, { rating_avg: newRatingAvg });
          }

          res.status(200).send({ message: "comment successfully changed." });
        } else {
          throw new Error("unauthorized");
        }
      } else {
        throw new Error("comment");
      }
    } catch (e) {
      if (e.message === "userId") {
        res.status(404).send({ message: "userId not existed" });
      } else if (e.message === "commentId") {
        res.status(404).send({ message: "commentId not existed" });
      } else if (e.message === "text&&rating") {
        res.status(404).send({ message: "text and rating not existed" });
      } else if (e.message === "unauthorized") {
        res.status(401).send({ message: "you are unauthorized." });
      } else if (e.message === "comment") {
        res.status(404).send({ message: "comment not existed" });
      }
    }
  },
  good: async (req: Request, res: Response) => {
    try {
      let commentId: number;
      let userId: number;
      if (req.body.commentId) {
        commentId = req.body.commentId;
      } else {
        throw new Error("commentId");
      }
      if (req.session!.passport) {
        userId = req.session!.passport!.user;
      } else {
        throw new Error("user");
      }
      const userRepo = await getRepository(User);
      const commentRepo = await getRepository(Comment);
      const user = await userRepo.findOne(userId, {
        relations: ["good", "bad"],
      }); // 4==>userId
      const comment = await commentRepo.findOne(commentId);
      if (user) {
        if (comment) {
          let result = await userRepo
            .createQueryBuilder("user")
            .innerJoinAndSelect("user.good", "good")
            .where("good.id = :commentId", { commentId })
            .getOne();

          if (!result) {
            // 좋아요 누르기
            user.good = [...user.good, comment];
            await userRepo.save(user);

            comment.good_count++;
            await commentRepo.save(comment);

            res.status(200).send({
              data: { goodCount: comment.good_count },
              message: "good button clicked.",
            });
          } else {
            // 좋아요 취소
            user.good = user.good.filter((c) => c.id !== comment.id);
            await userRepo.save(user);

            comment.good_count--;
            await commentRepo.save(comment);

            res.status(200).send({
              data: { goodCount: comment.good_count },
              message: "good button cancelled.",
            });
          }
        } else {
          throw new Error("comment");
        }
      } else {
        throw new Error("user");
      }
    } catch (e) {
      if (e.message === "user") {
        res.status(401).send("no user");
      }
      if (e.message === "commentId") {
        res.status(404).send("commentId not existed");
      }
      if (e.message === "comment") {
        res.status(404).send("comment not existed");
      }
    }
  },
  bad: async (req: Request, res: Response) => {
    try {
      let commentId: number;
      let userId: number;
      if (req.body.commentId) {
        commentId = req.body.commentId;
      } else {
        throw new Error("commentId");
      }
      // if (req.session!.passport) {
      //   userId = req.session!.passport!.user;
      // } else {
      //   throw new Error("user");
      // }
      userId = 6;
      const userRepo = await getRepository(User);
      const commentRepo = await getRepository(Comment);
      const user = await userRepo.findOne(userId, {
        relations: ["good", "bad"],
      }); // 4==>userId
      const comment = await commentRepo.findOne(commentId);
      if (user) {
        if (comment) {
          let result = await userRepo
            .createQueryBuilder("user")
            .innerJoinAndSelect("user.bad", "bad")
            .where("bad.id = :commentId", { commentId })
            .getOne();
          console.log(result);
          if (!result) {
            // 좋아요 누르기
            user.bad = [...user.bad, comment];
            await userRepo.save(user);

            comment.bad_count++;
            await commentRepo.save(comment);

            res.status(200).send({
              data: { badCount: comment.bad_count },
              message: "bad button clicked.",
            });
          } else {
            // 좋아요 취소
            user.bad = user.bad.filter((c) => c.id !== comment.id);
            await userRepo.save(user);

            comment.bad_count--;
            await commentRepo.save(comment);

            res.status(200).send({
              data: { badCount: comment.bad_count },
              message: "bad button cancelled.",
            });
          }
        } else {
          throw new Error("comment");
        }
      } else {
        throw new Error("user");
      }
    } catch (e) {
      if (e.message === "user") {
        res.status(401).send("no user");
      }
      if (e.message === "commentId") {
        res.status(404).send("commentId not existed");
      }
      if (e.message === "comment") {
        res.status(404).send("comment not existed");
      }
    }
  },
  re_post: async (req: Request, res: Response) => {
    try {
      const userRepo = await getRepository(User);
      const commentRepo = await getRepository(Comment);
      const recommentRepo = await getRepository(Recomment);
      const { commentId, text } = req.body;

      let userId: number;

      if (req.session!.passport!.user) {
        userId = req.session!.passport!.user;
      } else {
        throw new Error("userId");
      }
      if (!commentId) {
        throw new Error("commentId");
      }

      if (!text || text === "") {
        throw new Error("text");
      }

      const user = await userRepo.findOne(userId); // userId=>1
      const comment = await commentRepo.findOne(commentId);
      if (!user) {
        throw new Error("user");
      } else if (!comment) {
        throw new Error("comment");
      } else {
        let recomment = new Recomment();
        recomment.text = text;
        recomment.comment = comment;
        recomment.user = user;
        const newRecomment = await recommentRepo.save(recomment);
        newRecomment.user.password = "";
        res.status(200).send({
          data: {
            newRecomment,
          },
          message: "ok.",
        });
        return;
      }
    } catch (e) {
      console.log(e.message);
      if (e.message === "userId") {
        res.status(404).send({ message: "userId not existed" });
        return;
      } else if (e.message === "commentId") {
        res.status(404).send({ message: "commentId not existed" });
        return;
      } else if (e.message === "text") {
        res.status(401).send({ message: "text is empty" });
        return;
      } else if (e.message === "user") {
        res.status(404).send({ message: "user not existed" });
        return;
      } else if (e.message === "comment") {
        res.status(404).send({ message: "comment not existed" });
        return;
      } else {
        res
          .status(404)
          .send({ message: "text, wineId or accessToken not existed" });
      }
    }
  },
  re_delete: async (req: Request, res: Response) => {
    try {
      let commentId: number;
      let userId: number;

      if (req.body.commentId) {
        commentId = req.body.commentId;
      } else {
        throw new Error("commentId");
      }
      if (req.session!.passport!.user) {
        userId = req.session!.passport!.user;
      } else {
        throw new Error("userId");
      }
      const recommentRepo = getRepository(Recomment);
      const recomment = await recommentRepo.findOne({
        where: { id: commentId },
        relations: ["user"],
      });
      console.log(recomment);
      if (recomment) {
        if (recomment.user.id === userId) {
          await recommentRepo.remove(recomment);

          res.status(200).send({ message: "comment successfully deleted." });
        } else {
          throw new Error("unauthorized");
        }
      } else {
        throw new Error("comment");
      }
    } catch (e) {
      if (e.message === "commentId") {
        res.status(404).send({ message: "commentId not existed." });
      } else if (e.message === "userId") {
        res.status(404).send({ message: "userId not existed." });
      } else if (e.message === "comment") {
        res.status(404).send({ message: "comment not existed." });
      } else if (e.message === "unauthorized") {
        res.status(401).send({ message: "you are unauthorized." });
      }
    }
  },
  re_put: async (req: Request, res: Response) => {
    try {
      const { text, commentId } = req.body;
      let userId: number;

      if (req.session!.passport!.user) {
        userId = req.session!.passport!.user;
      } else {
        throw new Error("userId");
      }
      if (!commentId) {
        throw new Error("commentId");
      }

      if (!text || text === "") {
        throw new Error("text");
      }

      const recommentRepo = await getRepository(Recomment);
      const comment = await recommentRepo.findOne({
        where: { id: commentId },
        relations: ["user"],
      });
      if (comment) {
        if (comment.user.id === userId) {
          await recommentRepo.update(commentId, { text });
          res.status(200).send({ message: "comment successfully changed." });
        } else {
          throw new Error("unauthorized");
        }
      } else {
        throw new Error("comment");
      }
    } catch (e) {
      if (e.message === "userId") {
        res.status(404).send({ message: "userId not existed" });
      } else if (e.message === "commentId") {
        res.status(404).send({ message: "commentId not existed" });
      } else if (e.message === "text") {
        res.status(404).send({ message: "text not existed" });
      } else if (e.message === "unauthorized") {
        res.status(401).send({ message: "you are unauthorized." });
      } else if (e.message === "comment") {
        res.status(404).send({ message: "comment not existed" });
      }
    }
  },
};
