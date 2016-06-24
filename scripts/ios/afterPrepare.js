/**
 * Returns the abbreviation for a size trait.
 * 
 * @param {string} sizeTrait          compact | any
 * 
 * @returns {string}
 */
function getAbbreviationForSizeTrait(sizeTrait) {
    var abbreviations = {
        "compact": "com",
        "any": "any"
    }
    return !sizeTrait ? abbreviations.any : abbreviations[sizeTrait]
}

/**
 * Returns the universal splash screen for the specified traits from
 * the specified splash screens (obtained from config.xml)
 * 
 * @param {Array<Object>}                               splashes       array of splash screens as obtained from config.xml
 * @param {{scale:string, width:string, height:string}} traits         traits to query for; each can be compact, or any.
 * @returns {Object}
 */
function getUniversalSplashForTrait(splashes, traits) {
    var searchString;
    searchString = "@" + traits.scale
                       + "~universal~"
                       + getAbbreviationForSizeTrait(traits.width)
                       + getAbbreviationForSizeTrait(traits.height); 
    if (splashes) {
        return splashes.reduce(function(prev, cur) {
            return (cur.src.indexOf(searchString) >= 0 ? cur : prev);
        }, {})
    }
    return undefined;
}

module.exports = function(ctx) {
    if (ctx.opts.platforms.indexOf("ios") < 0) {
        return;
    }

    var shell = ctx.requireCordovaModule("shelljs");
    var path = ctx.requireCordovaModule("path");
    var events = ctx.requireCordovaModule("cordova-common").events;

    var configPath = ctx.requireCordovaModule("../cordova/util").projectConfig(ctx.opts.projectRoot);
    var ConfigParser = ctx.requireCordovaModule("cordova-common").ConfigParser;
    
    var cfg = new ConfigParser(configPath);
    var projectName = cfg.name();
    var splashScreens = cfg.getSplashScreens("ios");

    var scaleTraits = ["1x", "2x", "3x"];
    var sizeTraits = [{width: "any", height: "any"},
                      {width: "any", height: "compact"},
                      {width: "compact", height: "any"},
                      {width: "compact", height: "compact"}];

    var contents = {
        "info": {
            "version": 1,
            "author": "xcode"
        },
        "images": []
    };

    var numberOfUniversalSplashes = 0;

    if (splashScreens) {

        // TODO: remove existing splashes from launch media

        scaleTraits.forEach(function(scale) {
            scale.forEach(function (sizeTraits) {
                // create an entry in what will become contents.json for
                // the asset library LaunchMedia.xcassets
                var contentsImage = {
                    "idiom": "universal",       // these images apply to any device
                    "scale": scale
                };
                // if a size is "any", then the property shouldn't appear in the
                // content.json file; hence the following checks:
                if (sizeTraits.width != "any") {
                    contentsImage["width-class"] = sizeTraits.width;
                }
                if (sizeTraits.height != "any") {
                    contentsImage["height-class"] = sizeTraits.height;
                }

                // find the requested universal splash screen in splashScreens.
                var traits = {
                    scale: scale,
                    width: sizeTraits.width,
                    height: sizeTraits.height};
                var universalSplash = getUniversalSplashForTrait(splashScreens, traits);

                // if we find one, copy it to the desired location and add the filename
                // to our content.json object
                if (universalSplash && universalSplash.src) {
                    universalSplashes++;
                    var absSplashSource = path.join(ctx.opts.projectRoot, universalSplash.src);
                    var absSplashTarget = path.join(ctx.opts.projectRoot, "platforms", "ios", projectName, "Resources", "LaunchMedia.xcassets", path.baseName(universalSplash.src));
                    contentsImage["filename"] = path.baseName(universalSplash.src);
                    events.emit("verbose", "Copying universal splash to iOS project LaunchMedia.xcassets. " +
                                "src:" + absSplashSource +
                                " to:" + absSplashTarget
                            );
                    shell.cp("-f", absSplashSource, absSplashTarget);
                    events.emit("verbose", "Finished copying splash");
                }
                contents.images.push(contentsImage);
            });
        });

        // TODO: write out contents.json

        if (numberOfUniversalSplashes < 1) {
            events.emit("warn", "No universal splash screens found; launch storyboard will be empty!")
        }
    } else {
        events.emit("warn", "No splash screens found; launch storyboard will be default!")
    }
}
