
// 全局保存当前选中窗口
var g_iWndIndex = 0; //可以不用设置这个变量，有窗口参数的接口中，不用传值，开发包会默认使用当前选择窗口
$(function () {
	// 检查插件是否已经安装过
	if (-1 == WebVideoCtrl.I_CheckPluginInstall()) {
		alert("您还未安装过插件，双击开发包目录里的WebComponents.exe安装！");
		return;
	}
	
	// 初始化插件参数及插入插件
	WebVideoCtrl.I_InitPlugin(500, 300, {
        iWndowType: 2,
		cbSelWnd: function (xmlDoc) {
			g_iWndIndex = $(xmlDoc).find("SelectWnd").eq(0).text();
			var szInfo = "当前选择的窗口编号：" + g_iWndIndex;
			showOPInfo(szInfo);
		}
	});
	WebVideoCtrl.I_InsertOBJECTPlugin("divPlugin");

	// 检查插件是否最新
	if (-1 == WebVideoCtrl.I_CheckPluginVersion()) {
		alert("检测到新的插件版本，双击开发包目录里的WebComponents.exe升级！");
		return;
	}

	// 窗口事件绑定
	$(window).bind({
		resize: function () {
			var $Restart = $("#restartDiv");
			if ($Restart.length > 0) {
				var oSize = getWindowSize();
				$Restart.css({
					width: oSize.width + "px",
					height: oSize.height + "px"
				});
			}
		}
	});

    //初始化日期时间
    var szCurTime = dateFormat(new Date(), "yyyy-MM-dd");
    $("#starttime").val(szCurTime + " 00:00:00");
    $("#endtime").val(szCurTime + " 23:59:59");

	pushSxtMap();
	WebVideoCtrl.I_ChangeWndNum(2);
    loginAll();
});

// 登录
function clickLogin(obj) {
	var szIP = obj.ip,
		szPort = obj.port,
		szUsername = obj.username,
		szPassword = obj.password;

	if ("" == szIP || "" == szPort) {
		return;
	}

	var iRet = WebVideoCtrl.I_Login(szIP, 1, szPort, szUsername, szPassword, {
		success: function (xmlDoc) {
			showOPInfo(szIP + " 登录成功！");

			loginList.push(szIP);
			setTimeout(function () {
				getChannelInfo(szIP);
			}, 10);
		},
		error: function () {
			showOPInfo(szIP + " 登录失败！");
		}
	});

	if (-1 == iRet) {
		showOPInfo(szIP + " 已登录过！");
	}
}

// 获取通道
function getChannelInfo(ip) {
	var szIP = ip,
		//oSel = $("#channels").empty(),
		nAnalogChannel = 0;

	if ("" == szIP) {
		return;
	}

	// 模拟通道
	WebVideoCtrl.I_GetAnalogChannelInfo(szIP, {
		async: false,
		success: function (xmlDoc) {
			var oChannels = $(xmlDoc).find("VideoInputChannel");
			nAnalogChannel = oChannels.length;

			$.each(oChannels, function (i) {
				var id = parseInt($(this).find("id").eq(0).text(), 10),
					name = $(this).find("name").eq(0).text();
				if ("" == name) {
					name = "Camera " + (id < 9 ? "0" + id : id);
				}
				//oSel.append("<option value='" + id + "' bZero='false'>" + name + "</option>");
				channelsMap.put(szIP, {"id": id, "bZero": false});
			});
			showOPInfo(szIP + " 获取模拟通道成功！");
		},
		error: function () {
			showOPInfo(szIP + " 获取模拟通道失败！");
		}
	});
	// 数字通道
	WebVideoCtrl.I_GetDigitalChannelInfo(szIP, {
		async: false,
		success: function (xmlDoc) {
			var oChannels = $(xmlDoc).find("InputProxyChannelStatus");

			$.each(oChannels, function (i) {
				var id = parseInt($(this).find("id").eq(0).text(), 10),
					name = $(this).find("name").eq(0).text(),
					online = $(this).find("online").eq(0).text();
				if ("false" == online) {// 过滤禁用的数字通道
					return true;
				}
				if ("" == name) {
					name = "IPCamera " + ((id - nAnalogChannel) < 9 ? "0" + (id - nAnalogChannel) : (id - nAnalogChannel));
				}
				//oSel.append("<option value='" + id + "' bZero='false'>" + name + "</option>");
				channelsMap.put(szIP, {"id": id, "bZero": false});
			});
			showOPInfo(szIP + " 获取数字通道成功！");
		},
		error: function () {
			showOPInfo(szIP + " 获取数字通道失败！");
		}
	});
	// 零通道
	WebVideoCtrl.I_GetZeroChannelInfo(szIP, {
		async: false,
		success: function (xmlDoc) {
			var oChannels = $(xmlDoc).find("ZeroVideoChannel");
			
			$.each(oChannels, function (i) {
				var id = parseInt($(this).find("id").eq(0).text(), 10),
					name = $(this).find("name").eq(0).text();
				if ("" == name) {
					name = "Zero Channel " + (id < 9 ? "0" + id : id);
				}
				if ("true" == $(this).find("enabled").eq(0).text()) {// 过滤禁用的零通道
					//oSel.append("<option value='" + id + "' bZero='true'>" + name + "</option>");
					channelsMap.put(szIP, {"id": id, "bZero": true});
				}
			});
			showOPInfo(szIP + " 获取零通道成功！");
		},
		error: function () {
			showOPInfo(szIP + " 获取零通道失败！");
		}
	});
}

function pushSxtMap() {
	for (var i = 0; i < sxt.length; i++) {
		for (var j = 0; j < sxt[i].length; j++) {
			cxtMap.put(sxt[i][j].ip, sxt[i][j]);
		}
	}
}

// 开始预览
function clickStartRealPlay(ip, windIndex) {
	var sxt = cxtMap.get(ip);
	var oWndInfo = WebVideoCtrl.I_GetWindowStatus(windIndex),
		szIP = sxt.ip,
		iStreamType = sxt.streamtype,
		iChannelID = channelsMap.get(ip).id,
		bZeroChannel = channelsMap.get(ip).bZero,
		szInfo = "";
	
	if ("" == szIP) {
		return;
	}

	if (oWndInfo != null) {// 已经在播放了，先停止
		showOPInfo("video window: " + windIndex + " 已经在播放了，先停止");
		WebVideoCtrl.I_Stop(windIndex);
	}

	var iRet = WebVideoCtrl.I_StartRealPlayToWindow(szIP, {
		iStreamType: iStreamType,
		iChannelID: iChannelID,
		bZeroChannel: bZeroChannel
	}, windIndex);

	if (0 == iRet) {
		szInfo = "开始预览成功！";
	} else {
		szInfo = "开始预览失败！";
	}

	showOPInfo(szIP + " " + szInfo);
}

function showOPInfo(szInfo) {
	//szInfo =dateFormat(new Date(), "yyyy-MM-dd hh:mm:ss") + " " + szInfo;
	//console.info(szInfo);
}

function dateFormat(oDate, fmt) {
	var o = {
		"M+": oDate.getMonth() + 1, //月份
		"d+": oDate.getDate(), //日
		"h+": oDate.getHours(), //小时
		"m+": oDate.getMinutes(), //分
		"s+": oDate.getSeconds(), //秒
		"q+": Math.floor((oDate.getMonth() + 3) / 3), //季度
		"S": oDate.getMilliseconds()//毫秒
	};
	if (/(y+)/.test(fmt)) {
		fmt = fmt.replace(RegExp.$1, (oDate.getFullYear() + "").substr(4 - RegExp.$1.length));
	}
	for (var k in o) {
		if (new RegExp("(" + k + ")").test(fmt)) {
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
		}
	}
	return fmt;
}

var groupId = -1;
function getGroupId() {
	groupId++;
	if (groupId > sxt.length - 1) {
		groupId = 0;
	}
	return groupId;
}

function loginAll() {
	//clickLogin(sxt[0]);
	for (var i = 0; i < sxt.length; i++) {
		for (var j = 0; j < sxt[i].length; j++) {
			clickLogin(sxt[i][j]);
		}
	}
}

var loginList = new Array();

var cxtMap = new Map();

var channelsMap = new Map();

// 播放异常时是否关闭当前窗口前一个播放画面
var errorCloseWindow = true;

window.setTimeout(startPlay, 2000);

function startPlay() {
	var group_one = sxt[getGroupId()];
	for (var i = 0; i < group_one.length; i++) {
		try {
			clickStartRealPlay(group_one[i].ip, i + "");
		} catch(e) {
			showOPInfo(group_one[i].ip + " 发生异常, 系统将跳过该摄像头, 以及该窗口");
			if (errorCloseWindow) {
				WebVideoCtrl.I_Stop( i + "");
			}
		}
	}
	window.setInterval(loopPlay, 30000);
}

function loopPlay() {
	var group = sxt[getGroupId()];
	for (var i = 0; i < group.length; i++) {
		try {
			clickStartRealPlay(group[i].ip, i + "");
		} catch(e) {
			showOPInfo(group[i].ip + " 发生异常, 系统将跳过该摄像头, 以及该窗口");
			if (errorCloseWindow) {
				WebVideoCtrl.I_Stop( i + "");
			}
		}	
	}
}

