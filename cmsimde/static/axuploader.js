/*!
 * jQuery AXuploader
 * Alban Xhaferllari
 * albanx@gmail.com
 * Copyright 2010, AUTHORS.txt (http://www.albanx.com)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * 
 */
// 2013.08.21 Yen corrected Chrome file append error
// 2023.04.27 Yen add the resizeImage and rename functions before uploading
// 2023.05.25 Yen by pass the .gif file upload


/*================================================================================*\
 Add the resizeImage() before call add_file()
\*================================================================================*/
/* not for gif
function resizeImage(file, maxWidth, callback) {
  // Create a new FileReader object
  const reader = new FileReader();
  // Add an event listener to the FileReader object that listens for when the file is loaded
  reader.addEventListener("load", () => {
    // Create a new image object
    const img = new Image();
      // Add an event listener to the image object that listens for when the image is loaded
      img.addEventListener("load", () => {
      var ratio = Math.min(maxWidth / img.width);
      // Create a new canvas object
      const canvas = document.createElement("canvas");

      // Set the canvas width and height to the new width and height of the image
	  canvas.width = img.width * ratio;
	  canvas.height = img.height * ratio;

      // Draw the image onto the canvas with the new width and height
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert the canvas to a data URL
      const dataUrl = canvas.toDataURL("image/jpeg");

      // Create a new file object from the data URL
      const resizedFile = dataURLtoFile(dataUrl, file.name);

      // Return the resized file
      callback(resizedFile);
    });

    // Set the source of the image object to the data URL of the file
    img.src = reader.result;
  });

  // Read the file as a data URL
  reader.readAsDataURL(file);
}
*/

/*================================================================================*\
 Function to convert a data URL to a file object
\*================================================================================*/
/*
function dataURLtoFile(dataUrl, filename) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}
*/

function resizeImage(file, maxWidth, callback) {
    // For PNG and JPEG files
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const ratio = Math.min(maxWidth / img.width, 1);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) {
          callback(new File([blob], file.name, { type: file.type }));
        }, file.type);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }


/*================================================================================*\
 Function for axuploader plugin
\*================================================================================*/
(function($)
{
	var methods =
	{
		init : function(options)
		{
    	    return this.each(function() 
    	    {
    	        var settings = {
        	      'remotePath' : 'js/',
        	      'url':'phplibs/uploadfiles.php',
        	      'data':'',
        	      'async':true,
        	      'maxFiles':9999,
        	      'allowExt':['all'],
        	      'showSize':'Mb',
        	      'success':function(respTxt,fileName) {},
        	      'finish':function(respTxt,filesName) {},
        	      'error':function(e){},
        	      'GIFprogress':'',
        	      'enable':true,
        	      'chunkSize':1024*1024 //default 1Mb
    	        };

				var _this=this;
				if(options)	$.extend(settings,options);
				var allowExt=settings.allowExt.join('|').toLowerCase();

                /*================================================================================*\
				 Test if support pure ajax upload
				\*================================================================================*/
				var _browse = document.createElement('input');
				_browse.type = 'file'; 
				_browse.name='ax-files[]';
			    var isAjaxUpload=('multiple' in _browse &&  typeof File != "undefined" &&  typeof (new XMLHttpRequest()).upload != "undefined" );

				/*================================================================================*\
				 helper variables
				\*================================================================================*/
			    var fileCount=0;//Number of selected files
			    var totalFiles=0;

				/*================================================================================*\
				 Form for classic upload
				\*================================================================================*/
			    var onLoadIframe=false;
			    var mainFrame=$('<iframe src="javascript:false;" name="ax-main-frame" />').hide().appendTo(_this).load(function(){
			    	if(onLoadIframe)
			    	{
			    		fileCount=1;
			    		$(_this).find('.ax-progress-div').html('100%');
			    		onFinish(this.contentWindow.document.body.innerHTML,'',$(_this).find('.ax-upload'));
			    	}
				});

			    var mainForm=$('<form target="ax-main-frame" method="POST" action="" encType="multipart/form-data" />').appendTo(_this);

				/*================================================================================*\
				 Browse input used for selecting files to upload. Cloned for normal upload
				\*================================================================================*/

			    var browse=$(_browse).attr('multiple',isAjaxUpload).appendTo(mainForm).bind('change',function(){
					if(isAjaxUpload)
					{
						for (var i = 0; i < this.files.length; i++) 
						{
							if(fileCount<=settings.maxFiles)
							{
                            if (this.files[i].type.match(/image.*/)) {
                              if (this.files[i].type !== 'image/gif') {
                                resizeImage(this.files[i], 800, function(resizedImageBlob) {
                                  var fileSize = resizedImageBlob.size;
                                  add_file(fileList, resizedImageBlob, resizedImageBlob.name, fileSize, fileCount);
                                });
                              } else {
                                add_file(fileList, this.files[i], this.files[i].name, this.files[i].size, fileCount);
                              }
                            } else {
                              add_file(fileList, this.files[i], this.files[i].name, this.files[i].size, fileCount);
                            }
                          }
						}
					}
					else
					{
						if(fileCount<=settings.maxFiles)
						{
							add_file(fileList,this,this.value.replace(/^.*\\/, ''),0,fileCount);
						}
					}
				});

				/*================================================================================*\
				Upload All files button that upload files at once on click
				\*================================================================================*/
				var uploadAll=$('<input style="margin-left:5px;" type="button" value="Upload all" class="ax-uploadall" />').attr('disabled',true).appendTo(mainForm).bind('click',function(){
					if(isAjaxUpload)
					{
						$(_this).find('.ax-upload:not(:disabled)').click();
					}
					else
					{
						onLoadIframe=true;
						var finalUrl=get_final_url('');
						mainForm.attr('action',finalUrl).submit();

						$(_this).find('.ax-upload').attr('disabled',true);
						if(settings.GIFprogress!='')
							$(_this).find('.ax-progress-div').html('<img src="'+settings.GIFprogress+'" alt="uploading..." />');
						else
							$(_this).find('.ax-progress-div').html('Uploading...');
					}
				});

				/*================================================================================*\
				Clear buttons that resets file list and variables
				\*================================================================================*/
				var clear=$('<input style="margin-left:5px;" type="button" value="Clear" class="ax-clear" />').appendTo(mainForm).bind('click',function(){
					fileCount=0;
					totalFiles=0;
					uploadAll.attr('disabled',fileCount==0);
					fileList.children('tbody').remove();
				});

				/*================================================================================*\
				Table with the list of files and their details
				\*================================================================================*/
			    var fileList=$('<table class="ax-file-list" />').append('<thead><tr>'+
														'<th>New Filename</th>'+
													 	'<th>File</th>'+
													 	'<th>&nbsp;&nbsp;&nbsp;&nbsp;Size&nbsp;&nbsp;&nbsp;&nbsp;</th>'+
													 	'<th>Progress</th>'+
													 	'<th>Remove</th>'+
													 	'<th>Upload</th>'+
													 '</tr></thead>').appendTo(mainForm);

				
				/*================================================================================*\
				Functions that sets the url for sending additional data
				\*================================================================================*/
			    function get_final_url(enc_name)
			    {
					/*================================================================================*\
					 Encode remote path and calculate it if given as function
					\*================================================================================*/
					settings.remotePath=(typeof(settings.remotePath)=='function')?settings.remotePath():settings.remotePath;

					/*================================================================================*\
					 set other URL data
					\*================================================================================*/

					var c=(settings.url.indexOf('?')==-1)?'?':'&';
					var url=settings.url+c+'ax-file-path='+encodeURIComponent(settings.remotePath)+'&ax-allow-ext='+encodeURIComponent(allowExt);

					settings.data=(typeof(settings.data)=='function')?settings.data():settings.data;
					return url+'&ax-file-name='+enc_name+'&'+settings.data;//final url with other data
			    }

				
				/*================================================================================*\
				Functions that executes and the end of file uploading
				\*================================================================================*/
			    function onFinish(txt,currF,up,ab)
			    {
					fileCount--;//count upload files

					up.attr('disabled',false);
					settings.success(txt,currF);
					if(fileCount==0)
					{
						var filesArr=new Array();
						$(_this).find('.ax-file-name').each(function(){
							filesArr.push($(this).attr('title'));
						});
						fileCount=totalFiles;
						settings.finish(txt,filesArr);
						uploadAll.attr('disabled',false);
					}
			    }
				

				/*================================================================================*\
				Functions creates file form and xmlhttprequest for upload
				\*================================================================================*/
				function add_file(t,o,n,s,numF)
				{
					var ext=n.split('.').pop().toLowerCase();//file ext

					/*================================================================================*\
					File extension control
					\*================================================================================*/
					if(allowExt.indexOf(ext)<0 && allowExt!='all')	return;

					/*================================================================================*\
					Display file size in MB o Kb settings
					\*================================================================================*/
					switch(settings.showSize.toLowerCase())
					{
						case 'mb':s=s/(1024*1024);break;
						case 'kb':s=s/1024;break;
					}
					s=(Math.round(s*100)/100)+' '+settings.showSize;

					fileCount++;//update file number
					totalFiles++;

					uploadAll.attr('disabled',fileCount==0);
					//remove button action bind
					var rm=$('<input type="button" value="Remove" />').bind('click',function(){
						fileCount--;
						totalFiles--;
						uploadAll.attr('disabled',fileCount==0);
						$(this).parents('tr:first').remove();
					});

					//prepare abort and upload button
					var up=$('<input type="button" value="Upload" class="ax-upload" />').bind('click',function(){ this.disabled=true; });
					var tr=$('<tr />').appendTo(t);
					var fileSequence = fileCount + 1;
					var rename=$('<input class="new-file-name'+fileSequence+'" value="'+n+'" />').appendTo(tr);
					var td_n=$('<td class="ax-file-name" title="'+n+'" />').appendTo(tr).html(n);
					var td_s=$('<td class="ax-size-td" />').appendTo(tr).html(s);
					var td_p=$('<td class="ax-progress-td" />').appendTo(tr);
					var div_p=$('<div  class="ax-progress-div" />').css({'width':'0%','background-color':'red'}).html(0).appendTo(td_p);
					var td_r=$('<td class="ax-remove-td" />').appendTo(tr).append(rm);
					var td_u=$('<td class="ax-upload-td" />').appendTo(tr).append(up);
					
					/*================================================================================*\
					 Prepare to send
					\*================================================================================*/
					var enc_name=encodeURIComponent(n);//encode file name
	
					if(!isAjaxUpload)
					{
						var file_holder=$('<div />').appendTo(td_n).hide().append(o);						
						up.bind('click',function(){
							/*================================================================================*\
							 Target Iframe for async upload with iframes
							\*================================================================================*/
							var targetFrame=$('<iframe src="javascript:false;" name="ax-frame-'+numF+'" />').hide().appendTo(td_n).load(function(){
								if($(this).attr('load')=='1')
								{
									div_p.html('Finish');
									onFinish(this.contentWindow.document.body.innerHTML,n,up);
								}
							}).attr('load','0');
							div_p.html('Uploading...');
							targetFrame.attr('load','1');

							var finalUrl=get_final_url(enc_name);

							$('<form method="POST" action="'+finalUrl+'" encType="multipart/form-data" />').attr('target','ax-frame-'+numF).appendTo(td_n).hide().append(o).submit();
						});

						//clone browse file and append it to main form for selecting other files
						$(o).clone(true).val('').prependTo(mainForm);
					}
					else
					{
						/*================================================================================*\
						 bind actions to buttons
						\*================================================================================*/
						up.bind('click',function(){
							uploadFileXhr(o,0,$(this),div_p, fileSequence);
						});
					}
				}
				
				
				/*================================================================================*\
				 uploadFileXhr function
				\*================================================================================*/
				function uploadFileXhr(o, start_byte, up, div_p, fileSequence) {
				var totals = o.size;
				var chunk;
				var peice = settings.chunkSize; //bytes to upload at once

				var end_byte = start_byte + peice;
				var peice_count = end_byte / peice;
				var is_last = (totals - end_byte <= 0) ? 1 : 0;

				/*===============================================================*\
				 * Detect support slice method
				 * if slice is not supported then send all file at once
				 \*==============================================================*/

				// Initialize a new FileReader object
				var reader = new FileReader();

				// Slice the file into the desired chunk
				var chunk = o.slice(start_byte, end_byte);
				reader.readAsBinaryString(chunk);

				/*================================================================================*\
				 Prepare xmlhttpreq object for file upload Bind functions and progress
				 \*================================================================================*/
				var xhr = new XMLHttpRequest(); // prepare xhr for upload
				xhr.onreadystatechange = function() {
					if (this.readyState == 4 && this.status == 200) {
						if (is_last == 0) {
							uploadFileXhr(o, end_byte, up, div_p, fileSequence);
						} else {
							onFinish(xhr.responseText,o.name,up);
							div_p.html('100%').css('width', '100%');
						}
					}
				};
				xhr.upload.onprogress = function(e) {
					if (e.lengthComputable) {
						var perc = Math.round((e.loaded + peice_count * peice - peice) * 100 / totals);
						div_p.html(perc + '%').css('width', perc + '%');
					}
				};

				xhr.upload.onerror = settings.error(xhr.responseText, o.name);
				// before rename
				//var finalUrl=get_final_url(encodeURIComponent(o.name));
				// after rename, add input variable fileSequence
				var newFileName = $('.new-file-name'+fileSequence).val();
				var finalUrl=get_final_url(encodeURIComponent(newFileName));
				xhr.open('POST', finalUrl + '&start=' + start_byte, settings.async); // url + async/sync
				xhr.setRequestHeader('Cache-Control', 'no-cache');
				xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest'); // header
				// have to use json utf-8 charset
				xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
				xhr.send(chunk); // send request of file
			}

			/*=======================================================
			 * Disable option
			 *======================================================*/
			if(!settings.enable)
				$(this).find('input:not(:disabled), button:not(:disabled)').addClass('ax-disabled').attr('disabled',true);
    	    });
		},
		enable:function()
		{
			return this.each(function()
			{
				$(this).find('.ax-disabled').attr('disabled',false).removeClass('ax-disabled');
			});
		},
		disable:function()
		{
			return this.each(function()
			{
				$(this).find('input:not(:disabled), button:not(:disabled)').addClass('ax-disabled').attr('disabled',true);
			});
		},
		start:function()
		{
			$(this).find('.ax-uploadall:not(:disabled)').click();
		},
		clear:function()
		{
			(this).find('.ax-clear:not(:disabled)').click();
		},
		destroy : function()
		{
			return this.each(function()
			{
				var $this = $(this);
				$this.removeData('settings');
				$this.html('');
			});
		}
	};

	$.fn.axuploader = function(method, options)
	{
		if(methods[method])
		{
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		}
		else if(typeof method === 'object' || !method)
		{
			return methods.init.apply(this, arguments);
		}
		else
		{
			$.error('Method ' + method + ' does not exist on jQuery.axuploader');
		}
	};

})(jQuery);
