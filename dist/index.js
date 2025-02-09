"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const common_zod_all_1 = require("@mohit-kumar/common-zod-all");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
app.use(cors());
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(authHeader, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    }
    catch (error) {
        res.status(500).json({ message: 'Invalid token' });
    }
});
// Signup Route
app.post('/api/v1/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, name } = req.body;
    const result = common_zod_all_1.signupInput.safeParse({ name, email, password });
    if (!result.success) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const user = yield prisma.user.create({
            data: {
                name: result.data.name,
                email: result.data.email,
                password: result.data.password,
            },
        });
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        res.status(200).json({ jwt: token, name: user.name, id: user.id });
    }
    catch (error) {
        res.status(403).json({ error: 'Error while signing up' });
    }
}));
app.post('/api/v1/signin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const result = common_zod_all_1.signinInput.safeParse({ email, password });
    if (!result.success) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const user = yield prisma.user.findUnique({
            where: {
                email,
                password,
            },
        });
        if (!user) {
            return res.status(403).json({ error: 'User not found' });
        }
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        res.status(200).json({ jwt: token, name: user.name, id: user.id });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}));
app.post('/api/v1/blog', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, content } = req.body;
    const result = common_zod_all_1.createPostInput.safeParse({ title, content });
    if (!result.success) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const userId = req.userId;
        const post = yield prisma.post.create({
            data: {
                title: result.data.title,
                content: result.data.content,
                authorId: userId,
            },
        });
        return res.json({ id: post.id });
    }
    catch (error) {
        return res.status(500).json({ error: 'An error occurred while creating the post' });
    }
}));
app.put('/api/v1/blog', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, title, content } = req.body;
    const result = common_zod_all_1.updatePostInput.safeParse({ id, title, content });
    if (!result.success) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const userId = req.userId;
        yield prisma.post.update({
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
    }
    catch (error) {
        return res.status(500).json({ error: 'An error occurred while updating the post' });
    }
}));
app.delete('/api/v1/blog/:id', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const userId = req.userId;
    try {
        yield prisma.post.delete({
            where: {
                id: id,
                authorId: userId
            },
        });
        return res.status(200).json({ message: 'Post deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ error: 'An error occurred' });
    }
}));
app.get('/api/v1/blog/:id', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    try {
        const post = yield prisma.post.findUnique({
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
    }
    catch (error) {
        return res.status(500).json({ error: 'An error occurred' });
    }
}));
app.get('/api/v1/all-blog', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield prisma.post.findMany({
            select: {
                id: true,
                title: true,
                content: true,
                createdAt: true,
                authorId: true,
                author: {
                    select: {
                        name: true,
                        id: true
                    }
                }
            }
        });
        return res.status(200).json(posts);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'An error occurred while fetching posts' });
    }
}));
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
