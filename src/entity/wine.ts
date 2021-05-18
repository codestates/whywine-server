import { IncomingMessage } from "http";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Comment } from "./comment";
import { Tag } from "./tag";

@Entity()
export class Wine {
  @PrimaryGeneratedColumn()
  @OneToMany(() => Comment, (comment) => comment.wine)
  id: number;

  @Column()
  name: string;

  @Column()
  likeCount: number;

  @Column()
  description: string;

  @Column({ type: "blob" })
  image: Buffer;

  @Column()
  price: number;

  // 와인에 붙는 태그
  @ManyToMany(() => Tag)
  @JoinTable({ name: "wine_tag" })
  tags: Tag;
}