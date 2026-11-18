
// XqWebDlg.h: 头文件
//

#pragma once

#include "CSimpleClient.h"
#include "tool/TBuff.h"

// CXqWebDlg 对话框
class CXqWebDlg : public CDialog
{
// 构造
public:
	CXqWebDlg(CString strUrl, CWnd* pParent = nullptr);	// 标准构造函数

// 对话框数据
#ifdef AFX_DESIGN_TIME
	enum { IDD = IDD_XQWEB_DIALOG };
#endif

	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV 支持


// 实现
protected:
	HICON m_hIcon;

	// 生成的消息映射函数
	virtual BOOL OnInitDialog();
	afx_msg void OnSysCommand(UINT nID, LPARAM lParam);
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	DECLARE_MESSAGE_MAP()
	afx_msg void OnClose();
	afx_msg void OnSize(UINT nType, int cx, int cy);
	afx_msg void OnDestroy();
	afx_msg void OnBnClickedOk();
	afx_msg void OnBnClickedCancel();
	afx_msg void OnTimer(UINT_PTR nIDEvent);

	// 当前浏览器是否已经完成初始化
	BOOL m_bIsInited;

	// 浏览器对象
	CefRefPtr<CSimpleClient>  m_simpleClient;

	// 默认打开的链接
	CString m_strUrl;


};
