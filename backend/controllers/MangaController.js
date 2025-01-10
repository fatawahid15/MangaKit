const axios = require("axios");
const { User, Bookmark } = require("../models/index");
const baseUrl = "https://api.mangadex.org";
const coverBaseUrl = "https://uploads.mangadex.org/covers";
const pageBaseUrl = "https://api.mangadex.org/at-home/server";

class MangaController {
  static async getManga(req, res, next) {
    try {
      const searchQuery = req.query.search || "";
      const limit = parseInt(req.query.limit) || 10;
      let page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;

      const response = await axios.get(`${baseUrl}/manga`, {
        params: {
          title: searchQuery,
          limit,
          offset,
          contentRating: ["safe"],
          includes: ["cover_art"],
        },
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      const mangaList = response.data.data.map((manga) => {
        const coverArt = manga.relationships.find(
          (rel) => rel.type === "cover_art"
        );
        const coverFilename = coverArt ? coverArt.attributes.fileName : null;
        const coverUrl = coverFilename
          ? `${coverBaseUrl}/${manga.id}/${coverFilename}.256.jpg` 
          : null;

        return {
          id: manga.id,
          title: manga.attributes.title.en || "Title not available",
          description:
            manga.attributes.description.en || "No description available.",
          coverUrl: coverUrl,
        };
      });

      const totalResults = response.data.total;
      const totalPages = Math.ceil(totalResults / limit);

      res.status(200).json({
        mangas: mangaList,
        pagination: {
          totalResults,
          currentPage: page,
          totalPages,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBookmarkedMangas(req, res, next) {
    try {
      const bookmarks = await Bookmark.findAll({
        where: { UserId: req.userLoginData.id },
        attributes: ["bookmark"],
      });

      const bookmarkedMangaIds = bookmarks.map((b) => b.dataValues.bookmark);

      if (bookmarkedMangaIds.length === 0) {
        throw { name: "nullBookmark" };
      }

      const response = await axios.get(`${baseUrl}/manga`, {
        params: {
          ids: bookmarkedMangaIds,
          includes: ["cover_art"],
        },
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      const mangaList = response.data.data.map((manga) => {
        const coverArt = manga.relationships.find(
          (rel) => rel.type === "cover_art"
        );
        const coverFilename = coverArt ? coverArt.attributes.fileName : null;

        const coverUrl = coverFilename
          ? `${coverBaseUrl}/${manga.id}/${coverFilename}.256.jpg`
          : null;

          const title =
          manga.attributes.title.en ||
          Object.values(manga.attributes.title)[0] ||
          "Title not available";

        const description =
          manga.attributes.description.en ||
          Object.values(manga.attributes.description)[0] ||
          "No description available.";

        return {
          id: manga.id,
          title,
          description,
          coverUrl: coverUrl, 
        };
      });

      res.status(200).json({ mangas: mangaList });
    } catch (error) {
      next(error);
    }
  }

  static async addBookmark(req, res, next) {
    try {
      const { mangaId } = req.body;

      const checkBookMark = await Bookmark.findOne({
        where: { bookmark: mangaId, UserId: req.userLoginData.id },
      });

      if (checkBookMark) {
        throw { name: "AE" };
      }

      await Bookmark.create({
        bookmark: mangaId,
        UserId: req.userLoginData.id,
      });

      const user = await User.findAll({
        where: {
          id: req.userLoginData.id,
        },
        include: [
          {
            model: Bookmark,
          },
        ],
        attributes: {
          exclude: ["password", "createdAt", "updatedAt"],
        },
      });

      res.status(200).json({
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMangaById(req, res, next) {
    try {
      const { mangaId } = req.params;
  
      const response = await axios.get(`${baseUrl}/manga/${mangaId}`, {
        params: {
          includes: ["cover_art", "tag", "author", "artist"], 
        },
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });
  
      const mangaData = response.data.data;
  
      if (!mangaData) {
        throw { name: "NMF" }; 
      }
  
      const coverArt = mangaData.relationships.find(
        (rel) => rel.type === "cover_art"
      );
      const coverFilename = coverArt ? coverArt.attributes.fileName : null;
      const coverUrl = coverFilename
        ? `${coverBaseUrl}/${mangaData.id}/${coverFilename}.256.jpg`
        : null;
  
      const title =
        mangaData.attributes.title.en ||
        Object.values(mangaData.attributes.title)[0] ||
        "Title not available";
  
      const altTitles = Object.values(mangaData.attributes.title);
  
      const description =
        mangaData.attributes.description.en ||
        Object.values(mangaData.attributes.description)[0] ||
        "No description available.";
  
      const genres = mangaData.attributes.tags
        .filter((tag) => tag.attributes.group === "genre")
        .map((tag) => tag.attributes.name.en || Object.values(tag.attributes.name)[0]);
  
      const rating = mangaData.attributes.contentRating || "Not Rated";
  
      const authors = mangaData.relationships
        .filter((rel) => rel.type === "author" || rel.type === "artist")
        .map((rel) => rel.attributes.name);
  
      const readersCount = mangaData.attributes.followers || "No data on readers";
  
      res.status(200).json({
        manga: {
          id: mangaData.id,
          title,
          altTitles,
          genres,
          rating,
          description,
          coverImage: coverUrl,
          authors,
          readersCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  

  static async getChaptersByMangaId(req, res, next) {
    try {
      const { mangaId } = req.params;
      let { page, limit, order } = req.query;

      if (!page) {
        page = 1;
      }

      if (!limit) {
        limit = 20;
      }

      if (!order) {
        order = "asc";
      }

      const offset = (page - 1) * limit;

      const chapterResponse = await axios.get(`${baseUrl}/chapter`, {
        params: {
          manga: mangaId,
          limit: limit,
          offset: offset,
          order: { chapter: order },
        },
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      const chapters = chapterResponse.data.data.map((chapter) => ({
        id: chapter.id,
        title:
          chapter.attributes.title || `Chapter ${chapter.attributes.chapter}`,
        volume: chapter.attributes.volume,
        chapter: chapter.attributes.chapter,
        createdAt: chapter.attributes.createdAt,
      }));

      const totalChapters = chapterResponse.data.total;

      res.status(200).json({
        totalChapters,
        page: Number(page),
        limit: Number(limit),
        chapters,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMangaPageByChapter(req, res, next) {
    try {
      let { chapterId } = req.params;

      const response = await axios.get(`${pageBaseUrl}/${chapterId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      const cUrl = response.data.baseUrl;
      const hUrl = response.data.chapter.hash;
      const dSUrl = response.data.chapter.dataSaver;

      const imgUrls = dSUrl.map((page) => `${cUrl}/data-saver/${hUrl}/${page}`);

      res.status(200).json({
        imgUrls,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBookmark(req, res, next) {
    try {
      const { mangaId } = req.params;

      console.log(mangaId);

      const bookmark = await Bookmark.findOne({
        where: { UserId: req.userLoginData.id },
      });

      if (!bookmark) {
        throw { name: "BNE" };
      }

      await Bookmark.destroy({
        where: {
          bookmark: mangaId,
          UserId: req.userLoginData.id,
        },
      });

      res.status(200).json({
        message: `Bookmark ${bookmark.bookmark} deleted successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MangaController;
