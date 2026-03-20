// eleventy.config.js
export default function (eleventyConfig) {

    // Copy images, JS and JSON to public folder
    eleventyConfig.addPassthroughCopy("./_src/img");
    eleventyConfig.addPassthroughCopy("./_src/*.js");
    eleventyConfig.addPassthroughCopy("./_src/*.json");

    return {
        dir: {
            input: "_src",
            output: "_site"
        }
    };
};