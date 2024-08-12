import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
const cors =require("cors")
const jwt =require('jsonwebtoken')
import { signupInput, signinInput, createPostInput, updatePostInput } from "@mohit-kumar/common-zod-all";
const app = express();
const prisma = new PrismaClient();
app.use(express.json());
app.use(cors())




const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(authHeader, process.env.JWT_SECRET);
    (req as any).userId = decoded.id;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Invalid token' });
  }
};




// Signup Route
app.post('/api/v1/signup', async (req: Request, res: Response) => {
  const { email, password , name} = req.body;
  const result = signupInput.safeParse({ name, email, password });
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input'});
  }
  try {
    const user = await prisma.user.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
      },
    });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.status(200).json({ jwt: token , name:user.name , id:user.id});
  } catch (error) {
    res.status(403).json({ error: 'Error while signing up' });
  }
});




app.post('/api/v1/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = signinInput.safeParse({ email, password });
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input'});
  }
  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
        password,
      },
    });
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.status(200).json({ jwt: token, name:user.name , id:user.id});
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});





app.post('/api/v1/blog', authenticate, async (req: Request, res: Response) => {
  const { title, content } = req.body;
  const result = createPostInput.safeParse({ title, content });

  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input'});
  }

  try {
    const userId = (req as any).userId;
    const post = await prisma.post.create({
      data: {
        title: result.data.title,
        content: result.data.content,
        authorId: userId,
      },
    });
    return res.json({ id: post.id });
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while creating the post' });
  }
});





app.put('/api/v1/blog', authenticate, async (req: Request, res: Response) => {
  const { id, title, content } = req.body;
  const result = updatePostInput.safeParse({ id, title, content });

  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input'});
  }
  try {
    const userId = (req as any).userId;
    await prisma.post.update({
      where: {
        id: result.data.id,
        authorId: userId,
      },
      data: {
        title: result.data.title,
        content: result.data.content,
      },
    });
    return res.status(200).json({ message: 'Updated post' });
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while updating the post' });
  }
});




app.delete('/api/v1/blog/:id', authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.post.delete({
      where: { id },
    });
    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred' });
  }
});




app.get('/api/v1/blog/:id', authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.status(200).json(post);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred' });
  }
});




app.get('/api/v1/all-blog', authenticate, async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        createdAt:true,
        authorId:true,
        author: {
          select: {
            name: true,
            id:true
          }
        }
      }
    });

    return res.status(200).json(posts);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'An error occurred while fetching posts' });
  }
});





const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
