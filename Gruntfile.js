/* globals module */
module.exports = function (grunt) {
    /**
     * Automatically load all Grunttasks, which follow the pattern `grunt-*`
     */
    require('load-grunt-tasks')(grunt);

    /**
     * Project path specification
     */
    var paths = {
        source: "./Library",
        documentation: "./Documentation"
    };

    /**
     * Basic configuration for all watch tasks
     */
    grunt.config("watch", {
        options: {
            atBegin: true
        }
    });

    /**
     * jsdoc configuration to create a nice looking documentation of the
     * library
     */
    grunt.config("jsdoc", {
        library: {
            src: [
                paths.source + "/**/*.js",
                "README.md" /* Use Readme file as front page */
            ],
            options: {
                destination: paths.documentation,
                configure: "jsdoc.json",
                template: "node_modules/jaguarjs-jsdoc"
            }
        }
    });

    grunt.config("watch.documentation", {
        files: grunt.config.get("jsdoc.library.src"),
        tasks: ["jsdoc"]
    });

    grunt.registerTask("documentation", ["jsdoc"]);

    /**
     * Clean all the build and temporary directories
     */
    grunt.config("clean", {
        "documentation": [paths.documentation + "/**/*"]
    });


    /**
     * Default grunt tasks ;)
     */
    grunt.registerTask("build", ["documentation"]);
    grunt.registerTask("default", ["build"]);
};
