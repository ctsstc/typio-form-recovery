window.terafm = window.terafm || {};

(function(options, saveIndicator, editableManager, DOMEvents, initHandler) {

	initHandler.onInit(function() {
		let isEnabled = options.get('saveIndicator') !== 'disable';

		if(isEnabled) {

			addEventListeners();
		}
	});


	function addEventListeners() {

		DOMEvents.registerHandler('focus', function(e) {
			saveIndicator.build(function() {

				let isEditable = editableManager.isEditableText(e.path[0]) && editableManager.checkRules(e.path[0]);

				if(!isEditable) {
					return false;
				}

				saveIndicator.show()
				saveIndicator.animate();
			});
		});

		DOMEvents.registerHandler('blur', function() {
			saveIndicator.build(function() {
				saveIndicator.hide()
			});
		});



		DOMEvents.registerHandler('input', function(e) {
			let isEditable = editableManager.isEditableText(e.path[0]) && editableManager.checkRules(e.path[0]);

			saveIndicator.build(function() {

				if(!isEditable) {
					saveIndicator.hide();
				} else {
					saveIndicator.show();
					saveIndicator.pulse();
				}
			});
		});


	}

})(terafm.options, terafm.saveIndicator, terafm.editableManager, terafm.DOMEvents, terafm.initHandler);