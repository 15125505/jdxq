#include "pch.h"
#include "MsgPool.h"
#include "json/json.h"

std::vector<std::string> MsgPool::m_vecMsg;
CCriticalSection MsgPool::m_csLock;

void MsgPool::AddMsg(LPCWSTR lpszMsg)
{
	m_csLock.Lock();
	m_vecMsg.push_back(std::string(CString(lpszMsg)));
	m_csLock.Unlock();
}

bool MsgPool::GetMsg(std::string& strMsg)
{
	m_csLock.Lock();
	if (m_vecMsg.empty())
	{
		m_csLock.Unlock();
		return false;
	}
	strMsg = *m_vecMsg.begin();
	m_vecMsg.erase(m_vecMsg.begin());
	m_csLock.Unlock();
	return true;
}

bool MsgPool::GetProcessVec(const std::string& strMsg, std::vector<ProcessCheck>& vec)
{
	// 校验名称
	auto name = ParseName(strMsg);
	if (name != "process")
	{
		return false;
	}

	// 解析json
	Json::Reader reader;
	Json::Value root;
	reader.parse(strMsg, root);

	// 解析子节点
	auto vecJson = root["vec"];
	if (!vecJson.isArray())
	{
		return false;
	}
	vec.clear();
	for (size_t i = 0; i < vecJson.size(); i++)
	{
		ProcessCheck node;
		node.strClassName = vecJson[i]["className"].asString();
		node.strWindowName = vecJson[i]["windowName"].asString();
		node.strProcessName = vecJson[i]["processName"].asString();
		node.bFindInChildProcess = vecJson[i]["inChild"].asBool();
		vec.push_back(node);
	}

	return true;
}

bool MsgPool::GetDataVec(const std::string& strMsg, std::vector<DataCheck>& vec)
{
	// 校验名称
	auto name = ParseName(strMsg);
	if (name != "data")
	{
		return false;
	}

	// 解析json
	Json::Reader reader;
	Json::Value root;
	reader.parse(strMsg, root);

	// 解析子节点
	auto vecJson = root["vec"];
	if (!vecJson.isArray())
	{
		return false;
	}
	vec.clear();
	for (size_t i = 0; i < vecJson.size(); i++)
	{
		DataCheck node;
		node.name = vecJson[i]["name"].asString();
		node.begin = vecJson[i]["begin"].asString();
		node.end = vecJson[i]["end"].asString();
		if (vecJson[i]["sub"].isArray())
		{
			auto vecSub = vecJson[i]["sub"];
			for (size_t j = 0; j < vecSub.size(); j++)
			{
				auto begin = vecSub[j]["begin"].asString();
				auto end = vecSub[j]["end"].asString();
				node.vec.push_back(std::make_pair(begin, end));
			}
		}
		vec.push_back(node);
	}
	return true;
}

std::string MsgPool::ParseName(const std::string& strMsg)
{
	// 解析json
	Json::Reader reader;
	Json::Value root;
	bool bRet = reader.parse(strMsg, root);
	if (!bRet || !root.isObject())
	{
		return "";
	}

	// 获取名称
	auto name = root["name"];
	if (!name.isString())
	{
		return "";
	}
	return name.asString();
}

