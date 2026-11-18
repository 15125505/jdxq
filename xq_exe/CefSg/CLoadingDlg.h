#pragma once
#include "Process.h"


// CLoadingDlg 对话框

class CLoadingDlg : public CDialogEx
{
	DECLARE_DYNAMIC(CLoadingDlg)

public:
	CLoadingDlg(CWnd* pParent = nullptr);   // 标准构造函数
	virtual ~CLoadingDlg();

	CProcess& GetProcess() { return m_Proccess; };

// 对话框数据
#ifdef AFX_DESIGN_TIME
	enum { IDD = IDD_LOADING_DIALOG };
#endif

protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV 支持

	DECLARE_MESSAGE_MAP()
	virtual BOOL OnInitDialog();
	afx_msg void OnBnClickedOk();
	afx_msg void OnBnClickedCancel();
	afx_msg void OnTimer(UINT_PTR nIDEvent);

	// 线程相关
	HANDLE m_hThread;
	static UINT TH_Work(LPVOID lp);
	void Work();

	// 更新状态
	void UpdateState(CString strState);

	// 状态信息
	bool m_bChange;
	CString m_strState;
	CCriticalSection m_csLock;

	// 从服务器获取code
	BOOL GetCode(CString& strCode, CString& strErr);

	// 从服务器更新index.thml
	BOOL GetIndex(const CString& strCode, CString& strErr);

	// 从服务器更新main.js
	BOOL GetMain(const CString& strCode, CString& strErr);

	// 版本更新更新模块
	CProcess m_Proccess;
};
