const fs = require("fs");
const path = require("path");
const showdown = require("showdown");
const minifier = require("html-minifier");

const converter = new showdown.Converter({ metadata: true });

const DIST_PATH = process.env.DIST_PATH || path.join(__dirname, "..", "dist");
const POSTS_PATH = process.env.POSTS_PATH || path.join(__dirname, "..", "posts");
const TEMPLATES_PATH = process.env.TEMPLATES_PATH || path.join(__dirname, "templates");
const HOME_PATH = path.join(DIST_PATH, "index.html");

const homeTemplate = fs.readFileSync(path.join(TEMPLATES_PATH, "home.template.html"), "utf-8");
const postTemplate = fs.readFileSync(path.join(TEMPLATES_PATH, "post.template.html"), "utf-8");
const postComponent = fs.readFileSync(path.join(TEMPLATES_PATH, "post.component.html"), "utf-8");

function main() {
    try {
        rmDist();
        mkDist();

        const posts = getPosts().filter(isPostPublished);
        posts.forEach(renderPost);
        renderHome(posts);
    } catch (error) {
        rmDist();
        throw error;
    }
}
main();

function mkDist() {
    fs.mkdirSync(DIST_PATH);
}

function rmDist() {
    fs.rmSync(DIST_PATH, { recursive: true, force: true });
}

function getPosts() {
    return getPostFileNames().map(readPostFile).map(convertMarkdownToHTML);
}

function getPostFileNames() {
    try {
        return fs.readdirSync(POSTS_PATH).filter(isMarkdownFile);
    } catch {
        throw new Error(`Directory "${POSTS_PATH}" not found`);
    }
}

function isMarkdownFile(fileName) {
    return fileName.endsWith(".md");
}

function readPostFile(fileName) {
    const filePath = path.join(POSTS_PATH, fileName);
    try {
        return fs.readFileSync(filePath, "utf-8");
    } catch {
        throw new Error(`File "${filePath}" not found`);
    }
}

function convertMarkdownToHTML(markdownContent) {
    const html = converter.makeHtml(markdownContent);
    return { html, meta: converter.getMetadata() };
}

function renderPost(post) {
    fs.writeFileSync(
        path.join(DIST_PATH, post.meta.id),
        enrichTemplate(postTemplate, {
            $post: post.html,
            $title: post.meta.title,
            $updated_at: post.meta.updated_at,
            $published_at: post.meta.published_at,
            $published_by: post.meta.published_by
        })
    );
}

function renderHome(posts) {
    fs.writeFileSync(HOME_PATH, enrichTemplate(homeTemplate, { $posts: generatePostComponents(posts) }));
}

function generatePostComponents(posts) {
    return posts
        .map((post) =>
            enrichTemplate(postComponent, {
                $id: post.meta.id,
                $title: post.meta.title,
                $updated_at: post.meta.updated_at,
                $short_description: post.meta.short_description
            })
        )
        .join("");
}

function isPostPublished(post) {
    return Boolean(post.meta.published_at);
}

function enrichTemplate(template, data) {
    let enrichedTemplate = template;
    for (const field in data) {
        enrichedTemplate = enrichedTemplate.replaceAll(field, data[field]);
    }
    return optimizeHTML(enrichedTemplate);
}

function optimizeHTML(html) {
    return minifier.minify(html, {
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
        removeComments: true,
        removeAttributeQuotes: true,
        removeEmptyAttributes: true,
        keepClosingSlash: true,
        collapseWhitespace: true
    });
}
