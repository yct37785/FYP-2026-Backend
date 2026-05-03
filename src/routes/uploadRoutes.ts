import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { uploadImage } from "../middlewares/uploadMiddleware";
import { uploadBufferToCloudinary } from "../services/uploadService";

const router = Router();

router.post(
  "/image",
  authMiddleware,
  uploadImage.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image file is required." });
      }

      const folder =
        req.query.type === "profile"
          ? "eventsfinder/profile"
          : "eventsfinder/events";

      const result = await uploadBufferToCloudinary(req.file.buffer, folder);

      return res.status(201).json({
        url: result.url,
        publicId: result.publicId,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;