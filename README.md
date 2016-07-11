# cordova-plugin-ios-launch-screen

> * Version: 2.0
> * For: iOS 7+, cordova-ios 4.x+
> * Author: Kerri Shotts (kerrishotts@gmail.com)

This plugin provides launch screen storyboard support for iOS targets. Launch screen storyboards are required in order to fully
support the new iPad Pro as there is no mechanism for providing a device-specific launch image. This means that Cordova apps no
longer need to be rendered in "scaled" mode on the iPad Pro!

**NOTE**: Please consider this plugin a _proof of concept_! It has **not** been fully tested, and it's entirely possible there are
all sorts of edge cases where this fails. It works on my machines, but that doesn't necessarily mean anything. If you do encounter
issues, please consider filing a bug report (along with any verbose logs).

Also note that this plugin does not enable support for the new multitasking features provided by iOS 9. Though trivial to add,
I don't want to make this plugin responsible for two features. These changes will be implemented in a separate plugin.

## Installation

Using the Cordova / PhoneGap CLI:

```
$ cordova plugin add https://github.com/kerrishotts/cordova-plugin-ios-launch-screen#2.0.0 --save
```

Adding to `config.xml`:

```xml
<plugin name="cordova-plugin-ios-launch-screen" spec="https://github.com/kerrishotts/cordova-plugin-ios-launch-screen#2.0.0" />
```

## Use

The plugin is designed to work without much effort on your part. All you need to do is provide appropriate splash screens for the 
launch storyboard, and the plugin will take it from there.

Here's how it all works:

* At install-time: 
    1. A Launch Storyboard is added to the underlying iOS project
    2. A launch-specific asset library is added to the underlying iOS project
    3. Default launch images using the Cordova robot are added to the asset library's image set
    4. The project is configured to use the launch storyboard

* At prepare-time (also build, emulate, and run, and immediately after plugin install):
    1. `config.xml` is parsed to discover "universal" splash screens. These follow specific naming patterns, discussed below.
    2. These images are copied to the launch-specific asset library's image set.
    3. The launch-specific asset library's image set is updated to reference the new images.

> Note: When using `cordova prepare`, this plugin's hooks aren't run unless `ios` is specified explicitly. That is, `cordova prepare`
> will not update any splash screens, while `cordova prepare ios` _will_. When using `run` and `emulate`, the same would apply, but
> one typically does so when using these commands.

In order to fully understand what's going on, you need to understand size and density traits. In an image set, images can be
tailor-made to match specific screen densities (@1x, @2x, @3x) and screen sizes ("compact" or "any"). The combination of these two
traits result in a possible _nine_ images that can be tailored to various iOS devices. In practice, you can get by supplying only
_one_ image, but you'll most likely want to provide at least five.

> Note: there are other combinations of traits that can be used; but for our purposes, size and density are the important ones.

The screen densities themselves should be easy to understand. `1x` is considered low-resolution, `2x` is considered to be `retina`
or high-resolution, and `3x` is a step beyond that. Of supported devices targeted by `cordova-ios`, all devices will use either @2x
or @3x assets. As such, there is no point in supplying @1x assets.

The size traits are a bit more fuzzy to grasp. With the advent of multiple form factors and split-screen multitasking, it became
necessary for apps to be able to adjust their layout to various form factors without becoming bogged down by checking for each and
every possible screen size and device. Instead, Apple supplied two size classes: "compact" and "regular". 

These size classes describe the size of the viewport within which the app is rendering. If the viewport is pretty wide, the size
class will be "regular". If it's narrow, the class will be "compact". The same is true with respect to height as well. When using an
image set, you can then filter on either "compact" or "regular", but not both. Instead, one can filter on "any" to catch the other class.
This plugin uses "compact" and "any", the latter of which will match any "regular"-sized viewports.

To specify a universal splash screen, you need to edit your `config.xml` file and include the splash screen, like so 
(be sure to supply the correct path):

```xml
<platform name="ios">
    <splash src="res/splash/ios/Default@[scale]~universal~[width][height].png" />
</platform>
```

> Note: On most iOS splash elements, you would specify the width and height of the image via `width` and `height` attributes.
> However, these `width` and `height` attributes are not necessary. You can specify them if you wish, but they aren't required.

If you just wanted to specify a single launch image, you could use something like this:

```xml
<platform name="ios">
    <splash src="res/splash/ios/Default@2x~universal~anyany.png" />
</platform>
```

> Note: In this case, the image needs to be large enough to cover _all_ device classes, which is (currentlyl) 2732 x 2732. The image is 
> scaled to fit the screen using "aspect fill", which means the content in the middle will be in the middle of the device's screen
> as well. Depending on the screen size and orientation, various parts of the image will be cropped, and so only a narrow area in
> the center is safe to use.

The benefit of using image assets like this is that the device will pick the image that best matches the device. If only one is
supplied, only one will be used. However, it almost certainly means that the image will be scaled on some devices, which may be
something you wish to avoid.

The plugin comes with five default images, and you'll probably want to follow this example. This lets you be more specific with
regard to what areas of an image are safe and which areas aren't, and also lets you target devices with images that are more
specific to their screen size. For example, since only one device class matches an @3x density (the iPhone 6/6s +), you can
create a splash image specific to those devices. Keep in mind, however, that this could change in the future.

The five images provided by the plugin are as follows:

| Density |   Width   |   Height   |   Dimensions (safe)   | Filename                        | Viewports                                                |
|:-------:|:---------:|:----------:|:---------------------:|:--------------------------------|:---------------------------------------------------------|
|   @2x   |    any    |    any     |   2732(1808) x 2732   | Default@2x~universal~anyany.png | iPads (all orientations), iPad Pro (1/2 landscape split) |
|   @2x   |  compact  |    any     |   1278(853) x 2732    | Default@2x~universal~anycom.png | All iPads (1/3 and 2/3 splits), iPad Air and Minis (1/2 split), all portrait iPhones         |
|   @2x   |  compact  |  compact   |   1334(1125) x 750    | Default@2x~universal~comcom.png | All landscape iPhones _except_ iPhone 6+/6s+             |
|   @3x   |    any    |  compact   |   2208 x 1242         | Default@3x~universal~anycom.png | iPhone 6+/6s+ landscape                                  |
|   @3x   |  compact  |    any     |   1242 x 2208         | Default@3x~universal~comany.png | iPhone 6+/6s+ portrait                                   |

> Note: In Xcode, the compact size is represented by a dash ("-"), and the any size is represented by an asterisk ("*")

If all five were specified, `config.xml` would look something like this:

```xml
<platform name="ios">
    <splash src="res/splash/ios/Default@2x~universal~anyany.png" />
    <splash src="res/splash/ios/Default@2x~universal~anycom.png" />
    <splash src="res/splash/ios/Default@2x~universal~comcom.png" />
    <splash src="res/splash/ios/Default@3x~universal~anycom.png" />
    <splash src="res/splash/ios/Default@3x~universal~comany.png" />
</platform>
```

If images are detected or provided (or are in the wrong location), you'll either see a blank screen at the start of the app, or 
cropped variation of the following image:

![@2x, Any, Any Image](res/LaunchMedia.xcassets/SplashImages.imageset/Default%402x%7Euniversal%7Eanyany.png?raw=true "@2x, Any, Any image")

> Image from <http://cordova.apache.org/artwork/>

In either case, you'll receive a warning on the command-line that there was a problem detecting your launch images.

## Designing your launch screens

Apple suggests that your launch image should represent your app's unpopulated interface. Unfortunately, due to the way this plugin
works, it is probably going to be difficult to fully accomplish that goal for anything beyond a simple background color.

It is up to you whether you want to follow the single-image workflow are if you want to create several images. The first is slightly
easier in that you don't have to create a lot of files, but it imposes a lot of restrictions in the type of image you can create.
The latter requires more images, but you have a bit more control.

### Single-image workflow

Because the image is scaled using "aspect fill", you should render your launch image on a square canvas of sufficient size to cover
the screen of the 12.9-inch iPad Pro. This means your image should be at least 2732x2732, but it can be larger if you wish. If it is
smaller, it will simply be scaled up (with a corresponding loss of clarity).

One image _can_ work for all device form factors, orientations, and viewport sizes. This means that you can only reliably target
the center of the canvas so that you are sure the content isn't cropped in an undesirable manner. As such, my images have followed
this pattern:

* simple color wash for the background that matches the background color of the app, or

* a two-color wash for the background that matches the background color of the app and the background color of the navigation bar --
  the two colors fill the screen equally (navigation bar for top half, background color for bottom half)

* a simple logo or the app's name and tag line in the center of the app, sized such that it won't be cut off even on a small iPhone
  4s

    > Note: _Aspect ratio_ is important here, not physical pixels. An iPhone 4s uses a 3:2 aspect ratio, which means an
    > effective resolution of 1822 x 2732 (if using 2732 x 2732) in portrait.

* Size is not enforced, so you can use whatever canvas size makes sense for you. I tend to use 3072 (3 times 1024), but you might
  want to use something else. You can use a smaller size too, which makes sense for a color wash, but will blur any text or
  graphics.

#### Aspect ratios and crops

The following table should give you an idea of the areas that will be exposed on various devices. The crops are taken from the
center of the image, so for an iPhone 4s using a 2732x2732 source image, the visible area will be roughly (455, 0) - (2277, 2732).

|     device     | aspect ratio |  portrait   |  landscape  | 
|:--------------:|:------------:|:-----------:|:-----------:|
|   iPhone 4s    |      3:2     | 1822 x 2732 | 2732 x 1822 |
|   iPhone 5     |     16:9     | 1537 x 2732 | 2732 x 1537 |
|   iPhone 5s    |     16:9     | 1537 x 2732 | 2732 x 1537 |
|   iPhone 6/6+  |     16:9     | 1537 x 2732 | 2732 x 1537 |
|   iPhone 6s/6s+|     16:9     | 1537 x 2732 | 2732 x 1537 |
|      iPad      |      4:3     | 2048 x 2732 | 2732 x 2048 |
|   iPad Minis   |      4:3     | 2048 x 2732 | 2732 x 2048 |
| 12.9" iPad Pro |      4:3     | 2048 x 2732 | 2732 x 2048 |

### Multi-image workflows

There are only two devices that you can reliably target at the time of this writing: the "+" version of the iPhone 6 and 6s family.
As such, you can re-use the launch images you've probably already designed. Note that this could always change in the future.

For the remaining images, you will always be rendering in an environment that crops some portion of the image. As such, you still
must be careful to stay within safe areas emanating from the center of the image. You can follow the _single-image workflow_ to
create the `@2x~universal~anyany` version, and then use that version to adjust as needed for the `@2x~universal~comany` version.

The `@2x~univesal~comcom` version is used only by iPhones in landscape mode (excluding the "+" models). As such, you should be able
to use the image you've likely already created for the iPhone6/6s, with the understanding that smaller phones would crop the sides
by a small degree.

## Caveats

The plugin will copy over any changes made to the launch image at each prepare and clean operation. Unfortunately, this does not
guarantee that you'll see the launch image when you next launch the app. Apparently, iOS caches the launch screen, and I'm not sure
of a good way to clear this programmatically (if that is even possible). Even Xcode has this problem at times.

The simplest way to ensure that you see the desired splash screen in the simulator is to clear the simulator contents. This isn't
apt to be practical on your physical devices, unfortunately. A reboot of your device or a delete/reinstall of your app should do the
trick.

## Messages

The following are messages you may encounter that are generated by the plugin:

* Verbose:
    * Copying universal splash to iOS project LaunchMedia.xcassets. src: <source> to: <target> -- indicates that a universal splash
      image has been found and is about to be copied from the indicated path to the indicated location.
    * Finished copying splash -- indicates that the copy of a splash screen has been finished
* Warnings:
    * No universal splash screens found; launch storyboard will be empty! -- splash screens were found, but none of them were marked
      as universal images. As such, the resulting image set will be empty, causing the launch storyboard to appear empty as well.
      At run-time, this will result in a white screen at app launch.
    * No splash screens found; launch storyboard will be default! -- no splash screens at all were found, which means the plugin
      didn't do anything of consequence. Whatever the state of the storyboard and assets were prior to running `prepare` is what the 
      state will be after. At run-time, this will result in either the default images being displayed, _or_ the previous launch
      images you might have supplied in the past (depending on how you've used the plugin).

## Examples

This section links to some examples for your inspiration.

### Logology

The Logology splash is 3072x3072, and consists of a two-color background along with text for the app name and tag line. The top half
matches the color of the navigation bar (and status bar on iOS), and the bottom half matches the background color of the app.

![Logology Splash
Screen](https://github.com/kerrishotts/Mastering-PhoneGap-Code-Package/blob/master/design/iOS%20Launch%20Screen%20variation%202-3072.png?raw=true
"Logology Splash Screen")

### Other examples

If you create other examples, please feel free to submit with a PR.

## License

Apache 2.0 license. See LICENSE for full text.


