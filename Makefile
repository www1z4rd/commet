ZIP_NAME := commet.zip
ZIP_FILES := manifest.json background.js popup.html popup.js options.html options.js styles.css icon128.png iconGrey128.png _locales LICENSE.txt README.md

.PHONY: zip clean

zip:
	@echo "Creating $(ZIP_NAME)..."
	@rm -f $(ZIP_NAME)
	@zip -r $(ZIP_NAME) $(ZIP_FILES)
	@echo "Done: $(ZIP_NAME)"

clean:
	@rm -f $(ZIP_NAME)
	@echo "Removed $(ZIP_NAME)"
