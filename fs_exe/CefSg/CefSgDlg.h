
// CefSgDlg.h: 头文件
//

#pragma once

#include "CSimpleClient.h"
#include "tool/TBuff.h"
#include "Process.h"





// CCefSgDlg 对话框
class CCefSgDlg : public CDialog
{
// 构造
public:
	CCefSgDlg(CProcess &process, CWnd* pParent = nullptr);	// 标准构造函数

// 对话框数据
#ifdef AFX_DESIGN_TIME
	enum { IDD = IDD_CEFSG_DIALOG };
#endif

	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV 支持


// 实现
protected:


	HICON m_hIcon;

	// 探测信息节点
	struct ProbNode
	{
		std::string strTag;							// tag名称
		std::string strBegin;						// 需要查找头尾的tag头(如果该字段不为空，表示需要查找begin和end之间的内容)
		std::string strEnd;							// 需要查找头尾的tag尾
		std::map<std::string, int> mapValueCount;	// 目前找出来的值
		std::string strValue;						// 当前找出来的出现次数最多的值
		int nCount;									// 当前出现最多的次数

		ProbNode(LPCSTR lpszTagName, LPCSTR lpszBegin = "", LPCSTR lpszEnd = "")
		{
			nCount = 0;
			strTag = lpszTagName;
			strBegin = lpszBegin;
			strEnd = lpszEnd;
		}

		void Clear()
		{
			mapValueCount.clear();
			nCount = 0;
		}

		void Add(std::string v, CCefSgDlg *pDlg) 
		{
			int nCurCount = mapValueCount[v];
			mapValueCount[v] = ++nCurCount;
			if (nCurCount > nCount)
			{
				nCount = nCurCount; 
				strValue = v;
				//CString str;
				//str.Format("---(%s) (%d) %s : %d", strTag.c_str(), pDlg->m_nPercent, v.c_str(), nCurCount);
				//pDlg->Log(str);
			}
		}
	};

	// todo: 测试用
	int m_nPercent;

	// 当前浏览器是否已经完成初始化
	BOOL m_bIsInited;

	// 当前需要进行处理的节点列表
	std::vector<ProbNode> m_vecProb;

	// 浏览器对象
	CefRefPtr<CSimpleClient>  m_simpleClient;

	// 线程相关
	HANDLE m_hThread;
	volatile bool m_bStop;

	// 日志相关
	CCriticalSection m_csLock;
	std::vector<std::string> m_vecJs;

	// 用于记录各个tag值的map
	std::map<std::string, std::map<std::string, int>> m_mapTag;

	// 版本更新模块
	CProcess& m_Process;

	// 版本更新线程相关
	HANDLE m_hUpdate;
	volatile bool m_bStopUpdate;

	// 生成的消息映射函数
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	DECLARE_MESSAGE_MAP()
	afx_msg void OnClose();
	afx_msg void OnSize(UINT nType, int cx, int cy);
	afx_msg void OnDestroy();
	afx_msg void OnBnClickedOk();
	afx_msg void OnBnClickedRefresh();
	afx_msg void OnBnClickedCancel();
	afx_msg void OnTimer(UINT_PTR nIDEvent);

	// 在网页中执行js代码
	BOOL ExeJs(LPCSTR lpszCode);


	// 线程函数
	static UINT TH_Work(LPVOID lpContext);
	void Work();

	// 自动更新线程函数
	static UINT TH_Update(LPVOID lpContext);
	void Update();

	// 获取指定文件的内容
	BOOL GetFileContent(LPCSTR lpszFilePath, std::string &sContent);

	// 发送服务器日志
	void Log(LPCSTR lpszLog);

	// 安全执行js代码
	void ExeJsSafe(LPCSTR lpszCode);

	// 找到游戏进程Id
	DWORD FindProcessId(BOOL &bIsQQ);

	// 读取游戏进程的内存并处理
	BOOL ProcessGameMem(DWORD dwPID, BOOL bIsQQ);

	// 检查内存块
	BOOL CheckMem(byte* pBuff, DWORD dwLen);

	// 读取字段内容
	BOOL GetValue(byte* pBuff, size_t nLen, ProbNode& strTag, Tool::TBuff<byte>& buff);

	// 读取指定字符串之前的内容
	BOOL GetBetween(byte* pBuff, size_t nLen, ProbNode& strTag);

	// 修改字节序
	void ChangeBuf(byte* pBuff, size_t nLen)
	{
		for (size_t i = 0; i < nLen / 2; i++)
		{
			byte t = pBuff[i];
			pBuff[i] = pBuff[nLen - i - 1];
			pBuff[nLen - i - 1] = t;
		}
	}

	// 添加元素到map
	void AddMapNode(std::string strTag, LPCSTR strValue);

	// 找到指定tag的数据
	BOOL GetData(std::string strTag, std::string& strValue);

	// 检查浏览器状态，如果浏览器就绪了，那么自动打开我们指定的页面
	void CheckBrowser();

	// 窗口消息响应函数 -- JS消息
	afx_msg LRESULT OnJsMsg(WPARAM wp, LPARAM lp);

	// string的字符串替换函数
	void ReplaceString(std::string &strSrc, std::string strFind, std::string strReplace);

	// 对html文件进行自适应处理
	std::string IndexHtml();

	// 根据进程名称查找进程
	bool FindProcess(std::string strProcessName, DWORD& nPid);
};
