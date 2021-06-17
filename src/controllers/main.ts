import { Request, Response } from "express";
import { getRepository, In, Like } from "typeorm";
import { Tag } from "../entity/tag";
import { User } from "../entity/user";
import { Wine } from "../entity/wine";

interface sortedWine {
  [index: number]: Wine[];
  random3?: Wine[];
}

const getRandomThree = (sorted: sortedWine): Wine[] => {
  let random3: Wine[] = [];
  const sortedKeys: number[] = Object.keys(sorted)
    .map((el) => Number(el))
    .sort((a, b) => b - a);

  for (let key of sortedKeys) {
    while (random3.length <= 3) {
      if (sorted[key].length <= 3) {
        random3 = [...sorted[key]];
        break;
      }
      let result = sorted[key][Math.floor(Math.random() * sorted[key].length)]; // 랜덤으로 하나 꺼냄
      let flag = false;
      for (let r of random3) {
        if (r.id === result.id) {
          flag = true;
        }
      }
      if (flag === false) {
        random3.push(result);
      }
      if (random3.length === 3) {
        break;
      }
    }
    if (random3.length === 3) {
      break;
    }
  }
  return random3;
};
export = {
  tags: async (req: Request, res: Response) => {
    try {
      let tags: string[] = [];
      let sort: string[] = [];
      let wines: Wine[] = [];

      if (req.body.tags) {
        tags = req.body.tags;
      }
      if (req.body.sort) {
        sort = req.body.sort;
      }

      const wineRepo = await getRepository(Wine);

      if (tags.length === 0 && sort.length === 0) {
        // tag와 sort 둘 다 주어지지 않은 경우 204 리턴
        throw new Error("no tag and sort");
      } else if (tags.length !== 0 && sort.length === 0) {
        wines = await wineRepo
          .createQueryBuilder("wine")
          .innerJoinAndSelect("wine.tags", "tag")
          .where("tag.name IN (:...name)", { name: tags })
          .getMany();
      } else if (tags.length === 0 && sort.length !== 0) {
        wines = await wineRepo
          .createQueryBuilder("wine")
          .innerJoinAndSelect("wine.tags", "tag")
          .where("sort IN (:...sort)", { sort })
          .getMany();
      } else {
        wines = await wineRepo
          .createQueryBuilder("wine")
          .innerJoinAndSelect("wine.tags", "tag")
          .where("tag.name IN (:...name)", { name: tags })
          .andWhere("sort IN (:...sort)", { sort })
          .getMany();
      }

      // 와인을 태그매칭률에 따라 정렬한다
      const sorted: sortedWine = {};
      for (let wine of wines) {
        let tagLen = wine.tags.length;
        if (sorted[tagLen] === undefined) {
          sorted[tagLen] = [];
        }
        let result = await wineRepo.findOne({
          where: { id: wine.id },
          relations: ["tags"],
        });
        if (result) {
          sorted[tagLen].push(result);
        }
      }

      sorted["random3"] = getRandomThree(sorted);

      res.status(200).send({
        message: "ok.",
        data: {
          wines: {
            sorted,
          },
        },
      });
      return;
    } catch (e) {
      if (e.message === "no tag and sort") {
        res.status(204).send();
      } else {
        res.status(500).send("something is wrong");
      }
    }
  },
  search: async (req: Request, res: Response) => {
    try {
      let word: string;
      if (req.query.word) {
        word = String(req.query.word);
        if (word.length < 2) {
          throw new Error("search word is too short.");
        }
      } else {
        throw new Error("no word");
      }

      const wineRepo = await getRepository(Wine);

      const tags: object = {
        body_light: "가벼운",
        body_bold: "무거운",
        tannins_smooth: "부드러운",
        tannins_tannic: "떫은",
        acidity_soft: "산미가 적은",
        acidity_acidic: "산미가 높은",
        sweetness_dry: "씁쓸한",
        sweetness_sweet: "달달한",
      };

      let searchResult: Wine[];
      if (word === "wine" || word === "와인") {
        searchResult = await wineRepo.find();
      } else if (Object.values(tags).findIndex((el) => word === el) !== -1) {
        let idx = Object.values(tags).findIndex((el) => el === word);
        let key = Object.keys(tags)[idx];
        searchResult = await wineRepo
          .createQueryBuilder("wine")
          .innerJoinAndSelect("wine.tags", "tag")
          .where("tag.name = :key", { key })
          .getMany();
      } else {
        searchResult = await wineRepo
          .createQueryBuilder("wine")
          .innerJoinAndSelect("wine.tags", "tag")
          .where("wine.name like :word", { word: `%${word}%` })
          .orWhere("wine.sort like :word", { word: `%${word}%` })
          .orWhere("wine.description like :word", { word: `%${word}%` })
          .getMany();
      }

      if (searchResult.length === 0 || !searchResult) {
        throw new Error("no result");
      } else {
        res.status(200).send({
          message: "ok.",
          data: {
            wines: searchResult,
          },
        });
      }
    } catch (e) {
      if (e.message === "search word is too short.") {
        res.status(200).send({ message: "search word is too short." });
      } else if (e.message === "no word") {
        res.status(404).send({ message: "word not existed" });
      } else if (e.message === "no result") {
        res.status(204).send({ message: "search not existed" });
      } else {
        res.status(500).send("something is wrong.");
      }
    }
  },
};
