#pragma once

#include <string>

namespace Tool
{

class CEncrypt
{
public:
	CEncrypt(void);
	~CEncrypt(void);
	
	void MD5Data(const byte * pSrcData, DWORD dwSrcLen, char * pszMD5);


	//按照base64编码
	CString Encode(const CString &strSrc);

	//按照base64解码
	CString Decode(const CString &strEncode);

	//GB2312到UTF-8的转换
	std::string GB2312ToUtf8(const char* gb2312)
	{
		int len = MultiByteToWideChar(CP_ACP, 0, gb2312, -1, NULL, 0);
		wchar_t* wstr = new wchar_t[len + 1];
		memset(wstr, 0, len + 1);
		MultiByteToWideChar(CP_ACP, 0, gb2312, -1, wstr, len);
		len = WideCharToMultiByte(CP_UTF8, 0, wstr, -1, NULL, 0, NULL, NULL);
		char* pBuff = new char[len];
		WideCharToMultiByte(CP_UTF8, 0, wstr, -1, pBuff, len, NULL, NULL);
		std::string strUtf8;
		strUtf8.append(pBuff, len);
		delete[]pBuff;
		if (wstr) delete[] wstr;
		return strUtf8;
	}

private:

	/* MD5 context. */
	typedef struct MD5Context 
	{
		DWORD state[4];		/* state (ABCD) */
		DWORD count[2];		/* number of bits, modulo 2^64 (lsb first) */
		byte buffer[64];	/* input buffer */
	} MD5_CTX;

	void Encode(byte *output, DWORD * input, DWORD len);
	void Decode(DWORD * output, const byte *input, DWORD len);
	void MD5Transform(DWORD state[4], const byte block[64]);

	void Init(MD5_CTX *);
	void Update(MD5_CTX *, const byte *, DWORD);
	void Final(byte [16], MD5_CTX *);
	void End(MD5_CTX *, char *);
	static void initBase64DecodeTable();
};

}