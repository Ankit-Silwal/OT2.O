import type { Request,Response,NextFunction } from "express";
import jwt from "jsonwebtoken";
export function authMiddleware(req:Request, res:Response, next:NextFunction)
{
  const token = req.cookies.token;
  if (!token)
  {
    return res.status(401).json({ message: "No token" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret)
  {
    return res.status(500).json({ message: "JWT secret is not configured" });
  }

  try
  {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === "string" || !("userId" in decoded))
    {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.userId = String(decoded.userId);
    next();
  }
  catch
  {
    return res.status(403).json({ message: "Invalid token" });
  }
}