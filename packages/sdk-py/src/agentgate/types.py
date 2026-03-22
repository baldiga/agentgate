from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal

Permission = Literal["read", "query", "request", "instruct", "trigger_subagents"]


@dataclass
class AgentUser:
    id: str
    name: str
    email: str


@dataclass
class FileSource:
    name: str
    retrieval_query_url: str


@dataclass
class ApiKeySource:
    name: str
    endpoint: str
    token: str


@dataclass
class RepoSource:
    name: str
    clone_url: str
    branch: str


@dataclass
class AgentSources:
    files: list[FileSource] = field(default_factory=list)
    api_keys: list[ApiKeySource] = field(default_factory=list)
    repos: list[RepoSource] = field(default_factory=list)


@dataclass
class UserContext:
    message: str
    user: AgentUser
    role: str
    permissions: list[Permission]
    thread_id: str
    channel_id: str | None
    is_superadmin: bool
    sources: AgentSources
