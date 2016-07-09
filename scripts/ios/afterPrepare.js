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
    return !sizeTrait ? abbreviations.any : abbreviations[sizeTrait];
}

/**
 * Returns the universal splash screen for the specified traits from
 * the specified splash screens (obtained from config.xml)
 * 
 * @param {Array<Object>}                               splashes      array of splash screens as obtained from config.xml
 * @param {{scale:string, width:string, height:string}} traits        traits to query for; each can be compact, or any.
 * @returns {Object}
 */
function getUniversalSplashForTrait(splashes, traits) {
    var searchString;
    searchString = "@" + traits.scale
                       + "~universal~"
                       + getAbbreviationForSizeTrait(traits.width)
                       + getAbbreviationForSizeTrait(traits.height); 
    if (splashes) {
        return splashes.reduce(function(prev, cur) {                  // try to find a matching splash for the provided traits
            return (cur.src.indexOf(searchString) >= 0 ? cur : prev); 
        }, undefined);
    }
    return undefined;                                                 // no splashes provided, but be specific about the return
}

/**
 * Processes config.xml's splash entries to create an imageset that can be properly used by 
 * an associated launch storyboard (already added by the plugin on install). The filenames must
 * be of the form:
 * 
 *     [.*]@[:scale:]~universal~[:width size trait:][:height size trait:][.*]
 * 
 * where:
 * 
 *     [:scale:] is one of "1x", "2x", or "3x""
 *     [:width size trait:] is one of "com"(compact) or "any"
 *     [:height size trait:] is one of "com"(compact) or "any"
 * 
 * Example entries in config.xml:
 * 
 *     <splash platform="ios" src="Default@2x~universal~anyany.png"/> -- 2x splash screen suitable for any device size  Xcode: * *
 *     <splash platform="ios" src="Default@2x~universal~comany.png"/> -- 2x splash for most iPhones in portrait         Xcode: - *
 *     <splash platform="ios" src="Default@2x~universal~comcom.png"/> -- 2x splash for <= iPhone 5s in landscape        Xcode: - -
 *     <splash platform="ios" src="Default@3x~universal~comany.png"/> -- 3x splash for iPhone 6/6s plus in portrait     Xcode: - *
 *     <splash platform="ios" src="Default@2x~universal~anycom.png"/> -- 3x Splash for iPhone 6/6s plus in landscape    Xcode: * -
 * 
 * Note that width/height attributes are unnecessary. If specified, they are ignored, but can be useful for documentation and/or
 * other verification checks.
 * 
 * The function assumes the following:
 * 
 *   - Launch Screen.storyboard has been installed, which should be done at plugin installation
 *   - The project has been configued to use the Launch Screen.storyboard
 *   - LaunchMedia.xcassets has been installed, which should be done at plugin installation. This is a directory that contains
 *     several files. The structure looks like this:
 * 
 *       LaunchMedia.xcassets/                                        -- Asset library
 *         Contents.json                                              -- Provided by Xcode
 *         SplashImages.imageset/                                     -- Image set that contains splash images
 *           Contents.json                                            -- Indicates the images in this directory; we output this file
 *           Default@2x~universal~anyany.png                          -- Default images; will be overwritten by this function
 *           Default@2x~universal~comany.png
 *           Default@2x~universal~comcom.png 
 *           Default@3x~universal~comany.png 
 *           Default@3x~universal~anycom.png
 * 
 * @param {Object}  ctx   The hook's context provided by the Cordova CLI
 * 
 */
module.exports = function(ctx) {
    

    var shell = ctx.requireCordovaModule("shelljs");
    var path = ctx.requireCordovaModule("path");
    var fs = ctx.requireCordovaModule("fs");

    // this is so we can log information using Cordova's events.emit method
    var events = ctx.requireCordovaModule("cordova-common").events;
    events.emit("verbose", "Context:" + JSON.stringify(ctx,null,2));
    if (ctx.opts.cordova.platforms.indexOf("ios") < 0) {
        // if the user doesn't have an iOS platform, there's no point in doing any of this
        return;
    }

    events.emit("verbose", "Handling universal launch images for iOS");

    // we need access to the project's config.xml file so we can parse out splash screens
    var configPath = ctx.requireCordovaModule("../cordova/util").projectConfig(ctx.opts.projectRoot);
    var ConfigParser = ctx.requireCordovaModule("cordova-common").ConfigParser;
    var cfg = new ConfigParser(configPath);
    var splashScreens = cfg.getSplashScreens("ios");

    // asset library support
    var scaleTraits = ["1x", "2x", "3x"];                             // iOS currently supports @1-3x assets
    var sizeTraits = [{width: "any", height: "any"},                  // these are the various combinations of any and compact
                      {width: "any", height: "compact"},              // size traits that can occur inside an asset library
                      {width: "compact", height: "any"},
                      {width: "compact", height: "compact"}];

    var contents = {                                                  // object representation of the contents.json file
        "info": {                                                     // this section is boilerplate
            "version": 1,
            "author": "xcode"                                         // no idea if we have to use xcode here or not
        },
        "images": []                                                  // the launch images will be populated here
    };

    var projectName = cfg.name();                                     // the project name is necessary to correctly determine the
                                                                      // full path to the Xcode project files 
    var projectResourcesPath = path.join(ctx.opts.projectRoot,        // full path to the Xcode project's resources 
                                         "platforms", "ios", projectName, "Resources"); 
                                                                      
    var assetLibraryPath = path.join(projectResourcesPath,            // base path to the image set we're using in the asset library
                                     "LaunchMedia.xcassets", "SplashImages.imageset");

    var absSplashSource, absSplashTarget;                             // used later when copying images into the image set
    var numberOfUniversalImages = 0;

    events.emit("verbose", "Splash screens: " + JSON.stringify(splashScreens,null,2));                                                             
    if (splashScreens && splashScreens.length > 0) {

        /* TODO: DO WE WANT TO DO THIS?
        shell.rm("-f", path.join(assetLibraryPath,"*.png"));          // Remove all images in the image set; otherwise Xcode
                                                                      // complains a bit if viewed using Xcode
        */

        // Build up the `images` portion of the contents object
        scaleTraits.forEach(function(scale) {
            sizeTraits.forEach(function (sizeTrait) {
                var contentsImage = {                                 // every image entry has these portions
                    "idiom": "universal",                             // these images apply to any device
                    "scale": scale
                };

                // if a size is "any", then height/width property shouldn't appear in the content.json file; hence the following:
                if (sizeTrait.width != "any") {
                    contentsImage["width-class"] = sizeTrait.width;
                }
                if (sizeTrait.height != "any") {
                    contentsImage["height-class"] = sizeTrait.height;
                }

                // find the requested universal splash screen in splashScreens.
                var traits = {
                    scale: scale,
                    width: sizeTrait.width,
                    height: sizeTrait.height};
                var universalSplash = getUniversalSplashForTrait(splashScreens, traits);

                // if we find one, copy it to the desired location and add the filename to our content.json object
                if (universalSplash && universalSplash.src) {
                    numberOfUniversalImages++;
                    absSplashSource = path.join(ctx.opts.projectRoot, universalSplash.src);
                    absSplashTarget = path.join(assetLibraryPath, path.basename(universalSplash.src));
                    contentsImage["filename"] = path.basename(universalSplash.src);  // Using bracket notation to preserve JSON-like
                                                                                     // appearance
                    // Copy the image
                    events.emit("verbose", "Copying universal splash to iOS project LaunchMedia.xcassets. " +
                                "src:" + absSplashSource + " to:" + absSplashTarget);
                    shell.cp("-f", absSplashSource, absSplashTarget);
                    events.emit("verbose", "Finished copying splash");
                }

                contents.images.push(contentsImage);                  // add the image entry to our eventual Contents.json
            });
        });

        //write out Contents.json
        fs.writeFileSync(path.join(assetLibraryPath, "Contents.json"), 
                         JSON.stringify(contents, null, 2));

        if (numberOfUniversalImages < 1) {
            events.emit("warn", "No universal splash screens found; launch storyboard will be empty!")
        }
    } else {
        events.emit("warn", "No splash screens found; launch storyboard will be default!")
    }
}
